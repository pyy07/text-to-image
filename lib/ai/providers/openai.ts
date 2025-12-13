import OpenAI from 'openai'
import type { AIProviderInterface } from '../types'

export class OpenAIProvider implements AIProviderInterface {
  readonly name = 'openai' as const
  private client: OpenAI | null = null
  private apiKey: string | undefined
  private baseURL: string | undefined

  private isModelScopeInference(): boolean {
    const base = (this.baseURL || '').toLowerCase()
    return base.includes('api-inference.modelscope.cn')
  }

  private parseSize(size: string): { width?: number; height?: number } {
    const m = String(size || '').match(/^(\d+)\s*x\s*(\d+)$/i)
    if (!m) return {}
    const width = Number(m[1])
    const height = Number(m[2])
    if (!Number.isFinite(width) || !Number.isFinite(height)) return {}
    return { width, height }
  }

  private async generateImageViaModelScopeInference(args: {
    model: string
    prompt: string
    size: string
  }): Promise<{ imageUrl: string; mimeType?: string }> {
    // 参考 ModelScope 文档的 API-Inference 示例：
    // - base_url = 'https://api-inference.modelscope.cn/'
    // - POST /v1/images/generations (X-ModelScope-Async-Mode: true) -> task_id
    // - GET /v1/tasks/{task_id} (X-ModelScope-Task-Type: image_generation) -> output_images[0]
    // 文档页： https://modelscope.cn/models/Tongyi-MAI/Z-Image-Turbo
    const token = this.apiKey
    if (!token) throw new Error('OpenAI 兼容接口未配置，请设置 OPENAI_API_KEY（ModelScope Token）')

    const base = 'https://api-inference.modelscope.cn/'
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }

    const { width, height } = this.parseSize(args.size)
    const body: any = {
      model: args.model, // ModelScope Model-Id，例如 Tongyi-MAI/Z-Image-Turbo
      prompt: args.prompt,
    }
    if (width && height) {
      body.width = width
      body.height = height
    }

    const createRes = await fetch(`${base}v1/images/generations`, {
      method: 'POST',
      headers: { ...headers, 'X-ModelScope-Async-Mode': 'true' },
      body: JSON.stringify(body),
    })
    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '')
      throw new Error(`ModelScope 推理请求失败（${createRes.status}）：${text || 'unknown'}`)
    }

    const createJson: any = await createRes.json()
    const taskId: string | undefined = createJson?.task_id
    if (!taskId) {
      const keys = createJson && typeof createJson === 'object' ? Object.keys(createJson).join(',') : ''
      throw new Error(`ModelScope 推理返回缺少 task_id；response keys=${keys}`)
    }

    const start = Date.now()
    const timeoutMs = 120_000
    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('ModelScope 推理超时（等待任务完成超时）')
      }

      const taskRes = await fetch(`${base}v1/tasks/${taskId}`, {
        method: 'GET',
        headers: { ...headers, 'X-ModelScope-Task-Type': 'image_generation' },
      })
      if (!taskRes.ok) {
        const text = await taskRes.text().catch(() => '')
        throw new Error(`ModelScope 查询任务失败（${taskRes.status}）：${text || 'unknown'}`)
      }

      const taskJson: any = await taskRes.json()
      const status: string | undefined = taskJson?.task_status
      if (status === 'SUCCEED') {
        const url: string | undefined = taskJson?.output_images?.[0]
        if (!url) {
          const keys = taskJson && typeof taskJson === 'object' ? Object.keys(taskJson).join(',') : ''
          throw new Error(`ModelScope 任务完成但缺少 output_images[0]；response keys=${keys}`)
        }
        return { imageUrl: url, mimeType: 'image/png' }
      }

      if (status === 'FAILED') {
        const msg = taskJson?.message || taskJson?.error || ''
        throw new Error(`ModelScope 图像生成失败：${msg || 'FAILED'}`)
      }

      // 继续轮询（RUNNING/QUEUED/UNKNOWN 等）
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
    this.baseURL = process.env.OPENAI_BASE_URL?.trim()
    
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
      // ModelScope API-Inference 的 images/generations 是异步任务模式，OpenAI SDK 无法直接兼容，需走自定义流程
      if (this.isModelScopeInference()) {
        return await this.generateImageViaModelScopeInference({
          model: modelName,
          prompt: description,
          size,
        })
      }

      // OpenAI SDK 会根据 baseURL 走兼容接口
      // OpenAI SDK 对 size 做了枚举类型限制；兼容服务可能支持更多尺寸，故在此放宽为 any
      const response = await this.client.images.generate({
        model: modelName,
        prompt: description,
        size: size as any,
        response_format: 'url',
      })

      const resp: any = response as any
      const data0: any = resp?.data?.[0]

      // 兼容不同 OpenAI-compat 实现的字段命名（尽量宽松提取）
      const imageUrl: string | undefined =
        data0?.url ||
        data0?.image_url ||
        resp?.images?.[0]?.url ||
        resp?.output?.[0]?.url ||
        resp?.result?.[0]?.url ||
        resp?.url

      const b64: string | undefined =
        data0?.b64_json ||
        data0?.base64 ||
        resp?.images?.[0]?.b64_json ||
        resp?.output?.[0]?.b64_json ||
        resp?.result?.[0]?.b64_json

      if (!imageUrl) {
        // 某些兼容实现只返回 base64：这里转成 data URL，交给后续统一走 Vercel Blob 上传
        if (b64) {
          return { imageUrl: `data:image/png;base64,${b64}`, mimeType: 'image/png' }
        }
        const keys = data0 && typeof data0 === 'object' ? Object.keys(data0).join(',') : ''
        const topKeys = resp && typeof resp === 'object' ? Object.keys(resp).join(',') : ''
        throw new Error(
          `图片生成返回为空（未找到 url/base64 字段）。请检查模型/接口配置` +
            `${keys ? `；data[0] keys=${keys}` : ''}` +
            `${topKeys ? `；response keys=${topKeys}` : ''}`
        )
      }

      return { imageUrl, mimeType: 'image/png' }
    } catch (error: any) {
      console.error('OpenAI 兼容图片生成错误:', error)
      const status = error?.status
      const msg = error?.message || '未知错误'

      if (status === 400) throw new Error('请求参数错误，请检查模型/尺寸配置')
      if (status === 401) throw new Error('API Key 无效，请联系管理员检查配置')
      if (status === 403) throw new Error('API 访问被拒绝，请联系管理员')
      if (status === 404) {
        const base = this.baseURL || '(未设置)'
        throw new Error(
          `API 返回 404（404 page not found）。请检查 OPENAI_BASE_URL 是否指向 OpenAI 兼容的 v1 根路径（通常需要以 /v1 结尾，例如 https://xxx/v1），并确认该服务支持 Images API（/images/generations）。当前 OPENAI_BASE_URL=${base}`
        )
      }
      if (status === 429) throw new Error('API 调用次数超限，请稍后再试')

      if (msg.includes('network') || msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        throw new Error('网络连接失败，请稍后重试')
      }

      // 如果是我们主动抛出的业务错误（没有 status），直接把原始 message 透出，避免吞掉真正原因
      if (!status && typeof msg === 'string' && (msg.includes('图片生成返回') || msg.includes('response_format') || msg.includes('兼容接口未配置'))) {
        throw new Error(msg)
      }

      throw new Error(`图片生成失败，请稍后重试（${msg}）`)
    }
  }
}

