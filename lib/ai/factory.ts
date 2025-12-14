import type { AIProvider, AIProviderInterface } from './types'
import { GeminiProvider } from './providers/gemini'
import { OpenAIProvider } from './providers/openai'
import {
  getConfiguredProviders as getConfigProviders,
  getDefaultProvider as getConfigDefaultProvider,
  isProviderAllowed,
  isModelAllowed,
} from './config'

// Provider 实例缓存
const providerCache = new Map<AIProvider, AIProviderInterface>()

/**
 * 获取 AI Provider 实例
 */
export function getAIProvider(provider: AIProvider): AIProviderInterface {
  // 验证 provider 是否在允许列表中
  if (!isProviderAllowed(provider)) {
    throw new Error(`Provider ${provider} 未在配置文件中启用`)
  }

  // 使用缓存避免重复创建
  if (providerCache.has(provider)) {
    return providerCache.get(provider)!
  }

  let providerInstance: AIProviderInterface

  switch (provider) {
    case 'gemini':
      providerInstance = new GeminiProvider()
      break
    case 'openai':
      providerInstance = new OpenAIProvider()
      break
    default:
      throw new Error(`不支持的 AI Provider: ${provider}`)
  }

  providerCache.set(provider, providerInstance)
  return providerInstance
}

/**
 * 获取默认的 AI Provider
 */
export function getDefaultProvider(): AIProvider | null {
  return getConfigDefaultProvider()
}

/**
 * 获取所有已配置的 Provider
 */
export function getConfiguredProviders(): AIProvider[] {
  return getConfigProviders()
}

/**
 * 生成图片（使用指定的或默认的 provider）
 */
export async function generateImage(
  description: string,
  options?: {
    provider?: AIProvider
    model?: string
    size?: string
  }
): Promise<{ imageUrl: string; mimeType?: string }> {
  // 确定使用的 provider
  const provider = options?.provider || getDefaultProvider()
  
  if (!provider) {
    throw new Error('没有配置任何 AI Provider，请在环境变量中配置 AI_PROVIDERS')
  }

  // 验证 provider 是否在允许列表中
  if (!isProviderAllowed(provider)) {
    throw new Error(`Provider ${provider} 未在配置文件中启用`)
  }

  const providerInstance = getAIProvider(provider)
  
  if (!providerInstance.isConfigured()) {
    throw new Error(`${provider} Provider 未配置，请检查环境变量`)
  }

  // 如果指定了模型，验证模型是否在允许列表中
  if (options?.model && !isModelAllowed(provider, options.model)) {
    throw new Error(`模型 ${options.model} 未在配置文件中启用`)
  }

  return providerInstance.generateImage(description, {
    model: options?.model,
    size: options?.size,
  })
}

/**
 * 图片编辑/以图改图（首期：整体改图）
 */
export async function editImage(
  inputImageUrl: string,
  prompt: string,
  options?: {
    provider?: AIProvider
    model?: string
    size?: string
  }
): Promise<{ imageUrl: string; mimeType?: string }> {
  const provider = options?.provider || getDefaultProvider()

  if (!provider) {
    throw new Error('没有配置任何 AI Provider，请在环境变量中配置 AI_PROVIDERS')
  }

  if (!isProviderAllowed(provider)) {
    throw new Error(`Provider ${provider} 未在配置文件中启用`)
  }

  const providerInstance = getAIProvider(provider)

  if (!providerInstance.isConfigured()) {
    throw new Error(`${provider} Provider 未配置，请检查环境变量`)
  }

  if (options?.model && !isModelAllowed(provider, options.model)) {
    throw new Error(`模型 ${options.model} 未在配置文件中启用`)
  }

  return providerInstance.editImage(inputImageUrl, prompt, {
    model: options?.model,
    size: options?.size,
  })
}

/**
 * 兼容旧接口：generateContent / generateSVG 已弃用。
 * 仍保留导出以避免历史代码引用时报错，但会直接抛出提示。
 */
export async function generateContent(): Promise<string> {
  throw new Error('已切换为文生图：请使用 generateImage()')
}

export async function generateSVG(): Promise<string> {
  throw new Error('已移除 SVG 生成功能：请使用 generateImage()')
}

