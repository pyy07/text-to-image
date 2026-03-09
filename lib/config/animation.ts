/**
 * 文生动画功能配置
 * - 开关：ANIMATION_ENABLED=true 时开启
 * - 使用 UniAPI 配置：OPENAI_UNIAPI_BASE_URL、OPENAI_UNIAPI_API_KEY（与文生漫/模型试用共用）
 * - 从 OPENAI_UNIAPI_BASE_URL 推导 Gemini 地址，如 https://api.uniapi.io/v1 -> https://api.uniapi.io/gemini
 */

export function isAnimationEnabled(): boolean {
  return process.env.ANIMATION_ENABLED === 'true' || process.env.ANIMATION_ENABLED === '1'
}

export interface AnimationGeminiConfig {
  baseURL: string
  apiKey: string
  model: string
}

/** 从 UniAPI 的 v1 地址推导 Gemini 端点；若已为 /gemini 结尾则直接使用 */
function getUniApiGeminiBaseUrl(): string | null {
  const raw = process.env.OPENAI_UNIAPI_BASE_URL?.trim()
  if (!raw) return null
  if (/\/gemini\/?$/i.test(raw)) return raw.replace(/\/+$/, '')
  const base = raw.replace(/\/v1\/?$/, '')
  return base ? `${base}/gemini` : null
}

/**
 * 文生动画使用的 Gemini 配置：复用 UniAPI（OPENAI_UNIAPI_BASE_URL + OPENAI_UNIAPI_API_KEY）
 * 未配置或开关关闭时返回 null
 */
export function getAnimationGeminiConfig(): AnimationGeminiConfig | null {
  if (!isAnimationEnabled()) return null

  const baseURL = getUniApiGeminiBaseUrl()
  const apiKey = (process.env.OPENAI_UNIAPI_API_KEY || process.env.OPENAI_API_KEY)?.trim()
  if (!baseURL || !apiKey) return null

  const model = process.env.ANIMATION_GEMINI_MODEL?.trim() || 'gemini-3-flash-preview'
  return { baseURL, apiKey, model }
}
