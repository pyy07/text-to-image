import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProviderInterface } from '../types'

export class GeminiProvider implements AIProviderInterface {
  readonly name = 'gemini' as const
  private genAI: GoogleGenerativeAI | null = null
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey)
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.genAI
  }

  getAvailableModels(): string[] {
    // 从环境变量读取配置的模型列表
    const modelsEnv = process.env.GEMINI_MODELS
    
    if (!modelsEnv) {
      // 如果没有配置，返回空数组（不允许使用）
      return []
    }

    return modelsEnv.split(',').map((m) => m.trim()).filter(Boolean)
  }

  async generateImage(): Promise<{ imageUrl: string; mimeType?: string }> {
    throw new Error('Gemini Provider 暂不支持文生图（当前项目使用 OpenAI 兼容接口 + modelscope z-image）')
  }
}

