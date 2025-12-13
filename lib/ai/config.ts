import type { AIProvider } from './types'

/**
 * 从环境变量解析配置的 Provider 列表
 * 格式: AI_PROVIDERS=gemini,openai
 */
export function getConfiguredProviders(): AIProvider[] {
  const providersEnv = process.env.AI_PROVIDERS
  
  if (!providersEnv) {
    // 如果没有配置 AI_PROVIDERS，检查是否有 API Key（向后兼容）
    const providers: AIProvider[] = []
    if (process.env.GOOGLE_AI_API_KEY) {
      providers.push('gemini')
    }
    if (process.env.OPENAI_API_KEY) {
      providers.push('openai')
    }
    return providers
  }

  const providers = providersEnv.split(',').map((p) => p.trim()) as AIProvider[]
  
  // 验证 provider 是否有效
  const validProviders: AIProvider[] = []
  for (const provider of providers) {
    if (provider === 'gemini' || provider === 'openai') {
      // 检查是否有对应的 API Key
      if (provider === 'gemini' && process.env.GOOGLE_AI_API_KEY) {
        validProviders.push(provider)
      } else if (provider === 'openai' && process.env.OPENAI_API_KEY) {
        validProviders.push(provider)
      }
    }
  }
  
  return validProviders
}

/**
 * 从环境变量解析配置的模型列表
 * 格式: GEMINI_MODELS=gemini-2.0-flash-exp,gemini-1.5-pro
 */
export function getConfiguredModels(provider: AIProvider): string[] {
  const envKey = provider === 'gemini' ? 'GEMINI_MODELS' : 'OPENAI_MODELS'
  const modelsEnv = process.env[envKey]
  
  if (!modelsEnv) {
    // 如果没有配置模型列表，返回空数组（不允许使用）
    return []
  }

  return modelsEnv.split(',').map((m) => m.trim()).filter(Boolean)
}

/**
 * 获取默认 Provider
 */
export function getDefaultProvider(): AIProvider | null {
  const configuredProvider = process.env.AI_PROVIDER as AIProvider | undefined
  
  if (configuredProvider && ['gemini', 'openai'].includes(configuredProvider)) {
    const configuredProviders = getConfiguredProviders()
    if (configuredProviders.includes(configuredProvider)) {
      return configuredProvider
    }
  }

  // 返回第一个已配置的 Provider
  const providers = getConfiguredProviders()
  return providers[0] || null
}

/**
 * 验证 Provider 是否在允许列表中
 */
export function isProviderAllowed(provider: AIProvider): boolean {
  return getConfiguredProviders().includes(provider)
}

/**
 * 验证模型是否在允许列表中
 */
export function isModelAllowed(provider: AIProvider, model: string): boolean {
  const allowedModels = getConfiguredModels(provider)
  return allowedModels.length === 0 || allowedModels.includes(model)
}

