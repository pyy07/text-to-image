import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { editImage, getAIProvider, getDefaultProvider } from '@/lib/ai/factory'
import { uploadImageUrlToVercelBlob, uploadImageBufferToVercelBlob } from '@/lib/storage/vercel-blob'
import { incrementUserUsage } from '@/lib/auth'
import { getAnimationGeminiConfig } from '@/lib/config/animation'
import {
  generateAnimationWithGemini,
  type AnimationFormat,
} from '@/lib/services/animation-generation'

/**
 * 处理待处理的任务
 * 这个 API 可以被定期调用（例如通过 cron job）或在前端轮询时触发
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId } = body

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: '请提供 taskId' }, { status: 400 })
    }

    // 查找任务
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 检查任务是否已过期
    if (new Date() > task.expiresAt) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'expired',
          error: '任务已过期（超过 30 分钟）',
        },
      })
      return NextResponse.json({ error: '任务已过期' }, { status: 410 })
    }

    // 检查任务状态
    if (task.status === 'completed') {
      return NextResponse.json({
        success: true,
        taskId: task.id,
        status: 'completed',
        resultImageUrl: task.resultImageUrl,
        resultAssetId: task.resultAssetId,
      })
    }

    if (task.status === 'failed' || task.status === 'expired') {
      return NextResponse.json({
        success: false,
        taskId: task.id,
        status: task.status,
        error: task.error || '任务失败',
      })
    }

    // 如果任务正在处理中，返回当前状态
    if (task.status === 'processing') {
      return NextResponse.json({
        success: true,
        taskId: task.id,
        status: 'processing',
        message: '任务正在处理中...',
      })
    }

    // 开始处理任务
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'processing' },
    })

    try {
      if (task.type === 'animation') {
        // 文生动画：解析 description（JSON：userDescription + format），调用 Gemini 生成代码，上传 Blob，创建 Asset
        let userDescription: string
        let format: AnimationFormat
        try {
          const parsed = JSON.parse(task.description) as { userDescription?: string; format?: AnimationFormat }
          userDescription = parsed.userDescription ?? task.description
          format = parsed.format === 'h5' ? 'h5' : 'svg'
        } catch {
          userDescription = task.description
          format = 'svg'
        }

        const animConfig = getAnimationGeminiConfig()
        if (!animConfig) {
          throw new Error('文生动画未配置：请设置 ANIMATION_ENABLED=true 并配置 OPENAI_UNIAPI_BASE_URL 与 OPENAI_UNIAPI_API_KEY')
        }

        const { content, format: outFormat } = await generateAnimationWithGemini(
          animConfig,
          userDescription,
          format
        )

        const mimeType = outFormat === 'svg' ? 'image/svg+xml' : 'text/html'
        const prefix = process.env.VERCEL_BLOB_PREFIX || 'generated'
        const { url: imageUrl } = await uploadImageBufferToVercelBlob({
          buffer: Buffer.from(content, 'utf-8'),
          mimeType,
          prefix: `${prefix}/animation`,
          ext: outFormat === 'svg' ? 'svg' : 'html',
        })

        const assetData: Record<string, unknown> = {
          description: userDescription,
          type: outFormat,
          operation: 'animation',
          imageUrl,
          mimeType,
          provider: 'gemini',
          model: task.model ?? animConfig.model,
        }
        if (task.userId) {
          assetData.user = { connect: { id: task.userId } }
        }

        const asset = await prisma.asset.create({ data: assetData as any })

        const allowAnonymous =
          process.env.ALLOW_ANONYMOUS === 'true' ||
          (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')
        if (!allowAnonymous && task.userId) {
          await incrementUserUsage(task.userId)
        }

        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'completed',
            resultImageUrl: imageUrl,
            resultAssetId: asset.id,
          },
        })

        return NextResponse.json({
          success: true,
          taskId: task.id,
          status: 'completed',
          resultImageUrl: imageUrl,
          resultAssetId: asset.id,
          mimeType,
        })
      }

      // 以下为原有编辑任务逻辑
      const inputImageUrls: string[] = JSON.parse(task.inputImageUrls)
      const inputForEdit = inputImageUrls.length === 1 ? inputImageUrls[0] : inputImageUrls

      const generated = await editImage(inputForEdit, task.description, {
        provider: (task.provider as any) || undefined,
        model: task.model || undefined,
        size: task.size || undefined,
      })

      const providerImageUrl = generated.imageUrl
      const mimeType = generated.mimeType || 'image/png'

      // 上传到 Blob
      const blobPrefix = process.env.VERCEL_BLOB_PREFIX || 'generated'
      const { url: imageUrl } = await uploadImageUrlToVercelBlob({
        sourceUrl: providerImageUrl,
        mimeType,
        prefix: blobPrefix,
      })

      // 创建 Asset（模型试用编辑结果用 type=trial）
      const assetData: any = {
        description: task.description,
        type: task.source === 'trial' ? 'trial' : 'image',
        operation: task.type,
        imageUrl,
        mimeType,
        provider: task.provider,
        model: task.model,
        inputImageUrl: inputImageUrls.length === 1 ? inputImageUrls[0] : inputImageUrls.join(','),
      }

      if (task.userId) {
        assetData.user = { connect: { id: task.userId } }
      }

      const asset = await prisma.asset.create({ data: assetData })

      // 如果不允许匿名访问且任务有用户ID，增加使用次数
      const allowAnonymous =
        process.env.ALLOW_ANONYMOUS === 'true' ||
        (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')
      
      if (!allowAnonymous && task.userId) {
        await incrementUserUsage(task.userId)
      }

      // 更新任务状态
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          resultImageUrl: imageUrl,
          resultAssetId: asset.id,
        },
      })

      return NextResponse.json({
        success: true,
        taskId: task.id,
        status: 'completed',
        resultImageUrl: imageUrl,
        resultAssetId: asset.id,
        mimeType,
      })
    } catch (error: any) {
      // 处理失败：保证任务状态更新并返回 JSON，避免客户端收到 HTML
      let errorMessage =
        typeof error?.message === 'string'
          ? error.message
          : error?.toString?.()?.slice(0, 200) || '处理失败，请稍后重试'
      // 若上游返回了 HTML 错误页，避免把整段 HTML 存进任务或返回给前端
      if (errorMessage.includes('<!DOCTYPE') || errorMessage.includes('<html')) {
        errorMessage = '模型服务异常（请检查 UniAPI 配置与网络），请稍后重试'
      }
      console.error('[tasks/process] 动画/编辑任务失败:', errorMessage, error)
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          error: errorMessage,
        },
      })

      return NextResponse.json(
        {
          success: false,
          taskId: task.id,
          status: 'failed',
          error: errorMessage,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('处理任务错误:', error)
    const msg = typeof error?.message === 'string' ? error.message : '处理任务失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

