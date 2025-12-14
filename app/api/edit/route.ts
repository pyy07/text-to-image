import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider } from '@/lib/ai/types'
import { editImage, getAIProvider, getDefaultProvider } from '@/lib/ai/factory'
import { isModelAllowed, isProviderAllowed } from '@/lib/ai/config'
import { prisma } from '@/lib/prisma'
import { checkUserUsageLimit, incrementUserUsage } from '@/lib/auth'
import { uploadImageUrlToVercelBlob } from '@/lib/storage/vercel-blob'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, userId, provider, model, size, inputImageUrl, sourceAssetId } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: '编辑指令不能为空' }, { status: 400 })
    }

    // 匿名开关沿用 /api/generate 逻辑
    const allowAnonymous =
      process.env.ALLOW_ANONYMOUS === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')

    if (!userId && !allowAnonymous) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    if (userId) {
      const usageCheck = await checkUserUsageLimit(userId)
      if (!usageCheck.allowed) {
        return NextResponse.json(
          { error: '使用次数已用完', remaining: usageCheck.remaining },
          { status: 403 }
        )
      }
    }

    let resolvedInputUrl: string | null = null
    let resolvedSourceAssetId: string | null = null

    if (typeof inputImageUrl === 'string' && inputImageUrl) {
      resolvedInputUrl = inputImageUrl
    }

    if (!resolvedInputUrl && typeof sourceAssetId === 'string' && sourceAssetId) {
      const asset = await prisma.asset.findUnique({ where: { id: sourceAssetId } })
      if (!asset || !asset.imageUrl) {
        return NextResponse.json({ error: '原图素材不存在或没有图片' }, { status: 404 })
      }

      // 简单权限：若素材归属到某个用户，则仅允许本人编辑；匿名素材允许所有人编辑
      if (userId && asset.userId && asset.userId !== userId) {
        return NextResponse.json({ error: '无权限编辑该素材' }, { status: 403 })
      }

      resolvedInputUrl = asset.imageUrl
      resolvedSourceAssetId = asset.id
    }

    if (!resolvedInputUrl) {
      return NextResponse.json(
        { error: '请提供 inputImageUrl 或 sourceAssetId 作为输入图' },
        { status: 400 }
      )
    }

    // 校验 provider/model 白名单
    if (provider) {
      const providerName = provider as AIProvider
      if (!isProviderAllowed(providerName)) {
        return NextResponse.json({ error: `Provider ${providerName} 未在配置文件中启用` }, { status: 400 })
      }
      if (model && !isModelAllowed(providerName, model)) {
        return NextResponse.json({ error: `模型 ${model} 未在配置文件中启用` }, { status: 400 })
      }
    }

    // 确定实际使用的 provider/model
    const actualProvider: AIProvider | null = provider ? (provider as AIProvider) : getDefaultProvider()
    let actualModel: string | null = model || null
    if (!actualModel && actualProvider) {
      const providerInstance = getAIProvider(actualProvider)
      const availableModels = providerInstance.getAvailableModels()
      if (availableModels.length > 0) {
        // 编辑优先选择包含 "edit" 的模型（例如 Qwen/Qwen-Image-Edit-2509）
        const editModel = availableModels.find((m) => /edit/i.test(m))
        actualModel = editModel || availableModels[0]
      }
    }

    // 对于编辑：如果用户选了明显是“文生图”的模型，但模型列表里有 edit 模型，则自动切换到 edit 模型，避免 ModelScope 任务必然失败
    if (actualProvider) {
      const providerInstance = getAIProvider(actualProvider)
      const availableModels = providerInstance.getAvailableModels()
      const editModel = availableModels.find((m) => /edit/i.test(m))
      if (editModel && actualModel && !/edit/i.test(actualModel)) {
        actualModel = editModel
      }
    }

    const generated = await editImage(resolvedInputUrl, description, {
      provider: actualProvider || undefined,
      model: actualModel || undefined,
      size: typeof size === 'string' ? size : undefined,
    })

    const providerImageUrl = generated.imageUrl
    const mimeType = generated.mimeType || 'image/png'

    // 上传到 Blob：最终只保存 Blob URL
    const blobPrefix = process.env.VERCEL_BLOB_PREFIX || 'generated'
    const { url: imageUrl } = await uploadImageUrlToVercelBlob({
      sourceUrl: providerImageUrl,
      mimeType,
      prefix: blobPrefix,
    })

    const assetData: any = {
      description,
      type: 'image',
      operation: 'edit',
      imageUrl,
      mimeType,
      provider: actualProvider,
      model: actualModel,
      inputImageUrl: resolvedInputUrl,
    }

    if (resolvedSourceAssetId) {
      assetData.sourceAsset = { connect: { id: resolvedSourceAssetId } }
    }

    if (userId) {
      assetData.user = { connect: { id: userId } }
    }

    const asset = await prisma.asset.create({ data: assetData })

    if (userId) {
      await incrementUserUsage(userId)
      const updatedUsageCheck = await checkUserUsageLimit(userId)
      return NextResponse.json({
        success: true,
        imageUrl,
        mimeType,
        assetId: asset.id,
        remaining: updatedUsageCheck.remaining,
      })
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      mimeType,
      assetId: asset.id,
      remaining: -1,
    })
  } catch (error: any) {
    // 只在开发环境输出详细错误日志
    if (process.env.NODE_ENV === 'development') {
      console.error('编辑图片错误:', error)
    }
    const userFriendlyMessage = error.message || '编辑失败，请稍后重试'
    return NextResponse.json({ error: userFriendlyMessage }, { status: 500 })
  }
}


