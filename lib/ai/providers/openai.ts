import OpenAI from 'openai'
import type { AIProviderInterface } from '../types'

export class OpenAIProvider implements AIProviderInterface {
  readonly name = 'openai' as const
  private client: OpenAI | null = null
  private apiKey: string | undefined
  private baseURL: string | undefined

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
    this.baseURL = process.env.OPENAI_BASE_URL
    
    if (this.apiKey) {
      const config: {
        apiKey: string
        baseURL?: string
      } = {
        apiKey: this.apiKey,
      }
      
      // 如果配置了 BASE_URL，使用自定义端点（可用于代理或兼容 API）
      if (this.baseURL) {
        config.baseURL = this.baseURL
      }
      
      this.client = new OpenAI(config)
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.client
  }

  getAvailableModels(): string[] {
    // 从环境变量读取配置的模型列表
    const modelsEnv = process.env.OPENAI_MODELS
    
    if (!modelsEnv) {
      // 如果没有配置，返回空数组（不允许使用）
      return []
    }

    return modelsEnv.split(',').map((m) => m.trim()).filter(Boolean)
  }

  async generateImage(
    description: string,
    options?: {
      model?: string
      size?: string
    }
  ): Promise<{ imageUrl: string; mimeType?: string }> {
    if (!this.client || !this.apiKey) {
      throw new Error('OpenAI 兼容接口未配置，请设置 OPENAI_API_KEY')
    }

    // modelscope z-image：通过 OPENAI_MODEL 或 OPENAI_MODELS 配置
    const modelName = options?.model || process.env.OPENAI_MODEL || 'z-image'
    const size = options?.size || process.env.OPENAI_IMAGE_SIZE || '1024x1024'

    try {
      // OpenAI SDK 会根据 baseURL 走兼容接口
      const response = await this.client.images.generate({
        model: modelName,
        prompt: description,
        size,
        response_format: 'url',
      })

      const data0: any = (response as any).data?.[0]
      const imageUrl: string | undefined = data0?.url

      if (!imageUrl) {
        // 某些兼容实现可能只返回 b64_json
        if (data0?.b64_json) {
          throw new Error('图片生成返回 base64（b64_json），当前配置要求返回 URL（对象存储）。请检查 modelscope 兼容接口是否支持 response_format=url。')
        }
        throw new Error('图片生成返回为空，请检查模型/接口配置')
      }

      return { imageUrl, mimeType: 'image/png' }
    } catch (error: any) {
      console.error('OpenAI 兼容图片生成错误:', error)
      const status = error?.status
      const msg = error?.message || '未知错误'

      if (status === 400) throw new Error('请求参数错误，请检查模型/尺寸配置')
      if (status === 401) throw new Error('API Key 无效，请联系管理员检查配置')
      if (status === 403) throw new Error('API 访问被拒绝，请联系管理员')
      if (status === 404) throw new Error('API 端点不存在，请检查 OPENAI_BASE_URL')
      if (status === 429) throw new Error('API 调用次数超限，请稍后再试')

      if (msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        throw new Error('网络连接失败，请稍后重试')
      }

      throw new Error('图片生成失败，请稍后重试')
    }
  }
}

