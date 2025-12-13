import { NextRequest, NextResponse } from 'next/server'
import { generateImage, getDefaultProvider, getAIProvider } from '@/lib/ai/factory'
import { checkUserUsageLimit, incrementUserUsage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { AIProvider } from '@/lib/ai/types'
import { isProviderAllowed, isModelAllowed } from '@/lib/ai/config'
import { uploadImageUrlToVercelBlob } from '@/lib/storage/vercel-blob'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      description, 
      userId, 
      provider, 
      model, 
      size
    } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: '描述不能为空' },
        { status: 400 }
      )
    }

    // 检查是否允许匿名访问（本地测试开关）
    // 方式1: 显式设置 ALLOW_ANONYMOUS=true
    // 方式2: 在开发环境（NODE_ENV=development）下默认允许
    const allowAnonymous = 
      process.env.ALLOW_ANONYMOUS === 'true' || 
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')

    // 如果未登录且不允许匿名访问，返回错误
    if (!userId && !allowAnonymous) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      )
    }

    // 如果已登录，检查用户使用次数限制
    if (userId) {
      const usageCheck = await checkUserUsageLimit(userId)
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
      type: 'image',
      imageUrl,
      mimeType,
      provider: actualProvider,
      model: actualModel,
    }
    
    // 如果已登录，使用关系连接用户（Prisma 5.22.0+ 要求）
    // 对于旧版本，也可以直接设置 userId，但新版本会报错
    if (userId) {
      assetData.user = {
        connect: { id: userId }
      }
    }
    // 注意：当 userId 为 null 时，不设置 user 字段，让 Prisma 自动处理
    
    const asset = await prisma.asset.create({
      data: assetData,
    })

    // 如果已登录，增加使用次数
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
    } else {
      // 匿名访问，不限制次数
      return NextResponse.json({
        success: true,
        imageUrl,
        mimeType,
        assetId: asset.id,
        remaining: -1, // 匿名访问显示无限制
      })
    }
  } catch (error: any) {
    // 详细错误信息记录在服务器日志中
    console.error('生成内容错误:', error)
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    
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

