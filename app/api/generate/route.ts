import { NextRequest, NextResponse } from 'next/server'
import { generateImage, getDefaultProvider, getAIProvider } from '@/lib/ai/factory'
import { checkUserUsageLimit, incrementUserUsage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { AIProvider } from '@/lib/ai/types'
import { isProviderAllowed, isModelAllowed, isAdvancedModel } from '@/lib/ai/config'
import { canUseAdvancedModels } from '@/lib/advanced-models-auth'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { uploadImageUrlToVercelBlob } from '@/lib/storage/vercel-blob'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      description, 
      userId: rawUserId, 
      provider, 
      model, 
      size,
      fromTrial,
    } = body
    // 模型试用页的素材保存为公开案例（不关联用户）；登录与次数校验仍用 rawUserId
    const userIdForAsset = fromTrial ? null : (rawUserId ?? null)

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: '描述不能为空' },
        { status: 400 }
      )
    }

    const isAdmin = !!(await getAdminFromRequest(request))

    // 检查是否允许匿名访问（本地测试开关）
    // 方式1: 显式设置 ALLOW_ANONYMOUS=true
    // 方式2: 在开发环境（NODE_ENV=development）下默认允许
    const allowAnonymous = 
      process.env.ALLOW_ANONYMOUS === 'true' || 
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')

    // 管理员不受登录与次数限制；否则按匿名开关校验
    if (!isAdmin && !allowAnonymous) {
      if (!rawUserId) {
        return NextResponse.json(
          { error: '请先登录' },
          { status: 401 }
        )
      }
      
      const usageCheck = await checkUserUsageLimit(rawUserId)
      if (!usageCheck.allowed) {
        return NextResponse.json(
          {
            error: '使用次数已用完',
            remaining: usageCheck.remaining,
          },
          { status: 403 }
        )
      }
    }

    // 验证 provider 和 model 是否在允许列表中
    if (provider) {
      const providerName = provider as AIProvider
      if (!isProviderAllowed(providerName)) {
        return NextResponse.json(
          { error: `Provider ${providerName} 未在配置文件中启用` },
          { status: 400 }
        )
      }
      
      if (model && !isModelAllowed(providerName, model)) {
        return NextResponse.json(
          { error: `模型 ${model} 未在配置文件中启用` },
          { status: 400 }
        )
      }
      // 先进模型需单独权限
      if (model && isAdvancedModel(providerName, model)) {
        const allowed = await canUseAdvancedModels(request, rawUserId)
        if (!allowed) {
          return NextResponse.json(
            { error: '功能未启用，请联系管理员，微信号为LukePanYY' },
            { status: 403 }
          )
        }
      }
    }

    // 确定实际使用的 provider 和 model（用于记录）
    let actualProvider: AIProvider | null = null
    let actualModel: string | null = null
    
    if (provider) {
      actualProvider = provider as AIProvider
    } else {
      // 如果没有指定 provider，使用默认值
      actualProvider = getDefaultProvider()
    }
    
    if (model) {
      actualModel = model
    } else if (actualProvider) {
      // 如果没有指定 model，使用该 provider 的第一个可用模型
      const providerInstance = getAIProvider(actualProvider)
      const availableModels = providerInstance.getAvailableModels()
      if (availableModels.length > 0) {
        actualModel = availableModels[0]
      }
    }

    // 生成图片（返回 URL）
    const generated = await generateImage(description, {
      provider: actualProvider || undefined,
      model: actualModel || undefined,
      size: typeof size === 'string' ? size : undefined,
    })
    const providerImageUrl = generated.imageUrl
    const mimeType = generated.mimeType || 'image/png'

    // 上传到 Vercel Blob（对象存储）：只保存 Blob URL（不双写）
    const blobPrefix = process.env.VERCEL_BLOB_PREFIX || 'generated'
    const { url: imageUrl } = await uploadImageUrlToVercelBlob({
      sourceUrl: providerImageUrl,
      mimeType,
      prefix: blobPrefix,
    })

    // 保存素材（无论是否登录）
    // 注意：Prisma 5.22.0+ 要求使用关系而不是直接设置外键字段
    // 但为了兼容旧版本（如生产环境的 5.19.0），我们使用条件判断
    const assetData: any = {
      description,
      type: fromTrial ? 'trial' : 'image',
      imageUrl,
      mimeType,
      provider: actualProvider,
      model: actualModel,
    }
    
    // 如果已登录且非试用页，使用关系连接用户（Prisma 5.22.0+ 要求）
    // 模型试用页（fromTrial）保存为公开案例，不关联用户
    if (userIdForAsset) {
      assetData.user = {
        connect: { id: userIdForAsset }
      }
    }
    
    const asset = await prisma.asset.create({
      data: assetData,
    })

    // 管理员或匿名模式或试用页：不扣次数，返回无限制；否则已登录用户扣次数
    if (isAdmin || allowAnonymous || !rawUserId) {
      return NextResponse.json({
        success: true,
        imageUrl,
        mimeType,
        assetId: asset.id,
        remaining: -1,
      })
    }
    await incrementUserUsage(rawUserId)
    const updatedUsageCheck = await checkUserUsageLimit(rawUserId)
    return NextResponse.json({
      success: true,
      imageUrl,
      mimeType,
      assetId: asset.id,
      remaining: updatedUsageCheck.remaining,
    })
  } catch (error: any) {
    // 只在开发环境输出详细错误日志
    if (process.env.NODE_ENV === 'development') {
      console.error('生成内容错误:', error)
    }
    
    // 返回用户友好的错误信息（不包含技术细节）
    const userFriendlyMessage = error.message || '生成失败，请稍后重试'
    
    // 如果错误信息包含技术细节，简化为通用提示
    let finalMessage = userFriendlyMessage
    if (userFriendlyMessage.includes('API 请求错误') || 
        userFriendlyMessage.includes('BASE_URL') ||
        userFriendlyMessage.includes('OPENAI_MODELS') ||
        userFriendlyMessage.includes('模型名称') ||
        userFriendlyMessage.includes('请检查：')) {
      finalMessage = '请求参数错误，请检查模型配置或稍后重试'
    } else if (userFriendlyMessage.includes('API Key') || userFriendlyMessage.includes('配置')) {
      finalMessage = 'API 配置错误，请联系管理员'
    } else if (userFriendlyMessage.includes('网络') || userFriendlyMessage.includes('连接')) {
      finalMessage = '网络连接失败，请稍后重试'
    }
    
    return NextResponse.json(
      { error: finalMessage },
      { status: 500 }
    )
  }
}

