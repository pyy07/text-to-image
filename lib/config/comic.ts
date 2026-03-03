/**
 * 文生漫功能配置
 * - 开关：COMIC_ENABLED，关闭后不提供文生漫能力
 * - 文生漫使用独立的 Gemini API：COMIC_GEMINI_BASE_URL、COMIC_GEMINI_API_KEY、COMIC_GEMINI_MODEL
 */

export function isComicEnabled(): boolean {
  return process.env.COMIC_ENABLED === 'true' || process.env.COMIC_ENABLED === '1'
}

export interface ComicGeminiConfig {
  baseURL: string
  apiKey: string
  model: string
}

/**
 * 文生漫使用的 Gemini 配置（base URL、API Key、模型名单独配置）
 * 未配置或开关关闭时返回 null
 */
export function getComicGeminiConfig(): ComicGeminiConfig | null {
  if (!isComicEnabled()) return null
  const baseURL = process.env.COMIC_GEMINI_BASE_URL?.trim()
  const apiKey = process.env.COMIC_GEMINI_API_KEY?.trim()
  if (!baseURL || !apiKey) return null
  const model = process.env.COMIC_GEMINI_MODEL?.trim() || 'gemini-2.0-flash-exp'
  return { baseURL, apiKey, model }
}
