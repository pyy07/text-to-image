import { NextResponse } from 'next/server'
import { getConfiguredProviders, getAIProvider, getDefaultProvider } from '@/lib/ai/factory'
import type { AIProvider } from '@/lib/ai/types'

/**
 * 获取所有可用的 AI Provider 和模型列表
 * 只返回配置文件中允许的 Provider 和模型
 */
export async function GET() {
  try {
    const configuredProviders = getConfiguredProviders()
    
    if (configuredProviders.length === 0) {
      return NextResponse.json({
        providers: [],
        defaultProvider: null,
        error: '没有配置任何 AI Provider，请在环境变量中配置 AI_PROVIDERS',
      })
    }
    
    const providers = configuredProviders.map((providerName) => {
      try {
        const provider = getAIProvider(providerName)
        const models = provider.getAvailableModels()
        
        return {
          name: providerName,
          configured: provider.isConfigured(),
          models: models, // 只返回配置文件中允许的模型
        }
      } catch (error) {
        // 如果 provider 未启用，跳过
        return null
      }
    }).filter((p) => p !== null) as Array<{
      name: AIProvider
      configured: boolean
      models: string[]
    }>

    // 获取默认 Provider
    const defaultProvider = getDefaultProvider()

    return NextResponse.json({
      providers,
      defaultProvider,
    })
  } catch (error) {
    console.error('获取 Provider 列表错误:', error)
    return NextResponse.json(
      { error: '获取 Provider 列表失败' },
      { status: 500 }
    )
  }
}

