/**
 * 文生漫功能配置
 * - 开关：COMIC_ENABLED=true 时开启
 * - 使用 UniAPI 配置：OPENAI_UNIAPI_BASE_URL、OPENAI_UNIAPI_API_KEY（与模型试用共用，无需单独 COMIC_*）
 * - 从 OPENAI_UNIAPI_BASE_URL 推导 Gemini 地址，如 https://api.uniapi.io/v1 -> https://api.uniapi.io/gemini
 */

export function isComicEnabled(): boolean {
  return process.env.COMIC_ENABLED === 'true' || process.env.COMIC_ENABLED === '1'
}

export interface ComicGeminiConfig {
  baseURL: string
  apiKey: string
  model: string
}

/** 从 UniAPI 的 v1 地址推导 Gemini 端点，如 https://api.uniapi.io/v1 -> https://api.uniapi.io/gemini */
function getUniApiGeminiBaseUrl(): string | null {
  const v1 = process.env.OPENAI_UNIAPI_BASE_URL?.trim()
  if (!v1) return null
  const base = v1.replace(/\/v1\/?$/, '')
  return base ? `${base}/gemini` : null
}

/**
 * 文生漫使用的 Gemini 配置：优先用 UniAPI 配置（OPENAI_UNIAPI_BASE_URL + OPENAI_UNIAPI_API_KEY）
 * 未配置或开关关闭时返回 null
 */
export function getComicGeminiConfig(): ComicGeminiConfig | null {
  if (!isComicEnabled()) return null

  const baseURL = getUniApiGeminiBaseUrl()
  const apiKey = (process.env.OPENAI_UNIAPI_API_KEY || process.env.OPENAI_API_KEY)?.trim()
  if (!baseURL || !apiKey) return null

  const model = process.env.COMIC_GEMINI_MODEL?.trim() || 'gemini-2.0-flash-exp'
  return { baseURL, apiKey, model }
}
