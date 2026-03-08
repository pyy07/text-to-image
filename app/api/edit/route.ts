import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider } from '@/lib/ai/types'
import { editImage, getAIProvider, getDefaultProvider } from '@/lib/ai/factory'
import { isModelAllowed, isProviderAllowed } from '@/lib/ai/config'
import { prisma } from '@/lib/prisma'
import { checkUserUsageLimit, incrementUserUsage } from '@/lib/auth'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { uploadImageUrlToVercelBlob } from '@/lib/storage/vercel-blob'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, userId: rawUserId, provider, model, size, inputImageUrl, inputImageUrls, sourceAssetId, sourceAssetIds, fromTrial } = body
    // 模型试用页的编辑结果保存为公开案例（任务不关联用户）
    const userId = fromTrial ? null : (rawUserId ?? null)

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: '编辑指令不能为空' }, { status: 400 })
    }

    const isAdmin = !!(await getAdminFromRequest(request))

    const allowAnonymous =
      process.env.ALLOW_ANONYMOUS === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')

    // 管理员不受登录与次数限制
    if (!isAdmin && !allowAnonymous) {
      if (!rawUserId) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 })
      }
      const usageCheck = await checkUserUsageLimit(rawUserId)
      if (!usageCheck.allowed) {
        return NextResponse.json(
          { error: '使用次数已用完', remaining: usageCheck.remaining },
          { status: 403 }
        )
      }
    }

    // 支持多图输入
    let resolvedInputUrls: string[] = []
    let resolvedSourceAssetIds: string[] = []

    // 处理单图或多图 URL
    if (Array.isArray(inputImageUrls) && inputImageUrls.length > 0) {
      resolvedInputUrls = inputImageUrls.filter((url): url is string => typeof url === 'string' && !!url)
    } else if (typeof inputImageUrl === 'string' && inputImageUrl) {
      resolvedInputUrls = [inputImageUrl]
    }

    // 处理从素材库选择的图片
    if (Array.isArray(sourceAssetIds) && sourceAssetIds.length > 0) {
      const assets = await prisma.asset.findMany({
        where: { id: { in: sourceAssetIds } },
      })
      for (const asset of assets) {
        const assetWithImage = asset as any
        if (!assetWithImage.imageUrl) continue
        // 简单权限检查
        if (rawUserId && asset.userId && asset.userId !== rawUserId) {
          continue // 跳过无权限的素材
        }
        resolvedInputUrls.push(assetWithImage.imageUrl)
        resolvedSourceAssetIds.push(asset.id)
      }
    } else if (typeof sourceAssetId === 'string' && sourceAssetId) {
      const asset = await prisma.asset.findUnique({ where: { id: sourceAssetId } })
      if (asset) {
        const assetWithImage = asset as any
        if (assetWithImage.imageUrl) {
          // 简单权限：若素材归属到某个用户，则仅允许本人编辑；匿名素材允许所有人编辑
          if (rawUserId && asset.userId && asset.userId !== rawUserId) {
            return NextResponse.json({ error: '无权限编辑该素材' }, { status: 403 })
          }
          resolvedInputUrls.push(assetWithImage.imageUrl)
          resolvedSourceAssetIds.push(asset.id)
        }
      }
    }

    if (resolvedInputUrls.length === 0) {
      return NextResponse.json(
        { error: '请提供 inputImageUrl/inputImageUrls 或 sourceAssetId/sourceAssetIds 作为输入图' },
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

    // 创建异步任务
    const taskType = resolvedInputUrls.length > 1 ? 'compose' : 'edit'
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 分钟后过期

    const task = await prisma.task.create({
      data: {
        userId: userId || null,
        type: taskType,
        status: 'pending',
        description,
        inputImageUrls: JSON.stringify(resolvedInputUrls),
        provider: actualProvider,
        model: actualModel,
        size: typeof size === 'string' ? size : null,
        source: fromTrial ? 'trial' : null,
        expiresAt,
      },
    })

    // 立即返回任务 ID，不等待处理完成
    // 后台处理将在 /api/tasks/process 中完成
    return NextResponse.json({
      success: true,
      taskId: task.id,
      status: 'pending',
      message: '任务已创建，正在处理中...',
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


