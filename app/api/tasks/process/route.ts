import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { editImage, getAIProvider, getDefaultProvider } from '@/lib/ai/factory'
import { uploadImageUrlToVercelBlob } from '@/lib/storage/vercel-blob'
import { incrementUserUsage } from '@/lib/auth'

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
      // 解析输入图片
      const inputImageUrls: string[] = JSON.parse(task.inputImageUrls)
      const inputForEdit = inputImageUrls.length === 1 ? inputImageUrls[0] : inputImageUrls

      // 调用 AI 生成图片
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
      // 处理失败
      const errorMessage = error.message || '处理失败，请稍后重试'
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
    return NextResponse.json({ error: error.message || '处理任务失败' }, { status: 500 })
  }
}

