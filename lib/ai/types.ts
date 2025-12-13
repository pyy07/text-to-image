// AI Provider 类型定义

export type AIProvider = 'gemini' | 'openai'

// 内容类型：当前仅支持文生图
export type ContentType = 'image'

export interface AIConfig {
  provider: AIProvider
  model?: string
  apiKey: string
}

export interface AIGenerateOptions {
  description: string
  provider?: AIProvider
  model?: string
  contentType?: ContentType // 生成内容类型（当前仅 image）
  size?: string // 图片尺寸，例如 1024x1024（由具体 Provider 解释）
}

export interface AIProviderInterface {
  /**
   * Provider 名称
   */
  readonly name: AIProvider

  /**
   * 生成图片
   * @param description 用户描述（prompt）
   * @param options 生成选项
   */
  generateImage(
    description: string,
    options?: {
      model?: string
      size?: string
    }
  ): Promise<{
    imageUrl: string
    mimeType?: string
  }>

  /**
   * 检查配置是否有效
   */
  isConfigured(): boolean

  /**
   * 获取可用的模型列表
   */
  getAvailableModels(): string[]
}

