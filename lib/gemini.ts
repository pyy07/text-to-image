import { GoogleGenerativeAI } from '@google/generative-ai'

// 获取 Google AI Studio API Key
const apiKey = process.env.GOOGLE_AI_API_KEY

if (!apiKey) {
  console.warn('警告: GOOGLE_AI_API_KEY 未配置，请在 .env 文件中设置')
}

// 检查代理配置
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.PROXY
if (proxyUrl) {
  console.log('检测到代理配置:', proxyUrl.replace(/\/\/.*@/, '//***@')) // 隐藏密码
  // Node.js 18+ 的 fetch (undici) 会自动使用 HTTPS_PROXY 和 HTTP_PROXY 环境变量
  // 确保环境变量已设置
  if (!process.env.HTTPS_PROXY && proxyUrl.startsWith('http')) {
    process.env.HTTPS_PROXY = proxyUrl
  }
  if (!process.env.HTTP_PROXY && proxyUrl.startsWith('http')) {
    process.env.HTTP_PROXY = proxyUrl
  }
} else {
  console.warn('提示: 未检测到代理配置，如果无法连接 Google API，请在 .env 中设置 HTTPS_PROXY 或 HTTP_PROXY')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export async function generateSVG(description: string): Promise<string> {
  // 检查 API Key 是否配置
  if (!genAI || !apiKey) {
    throw new Error('Google AI API Key 未配置，请在 .env 文件中设置 GOOGLE_AI_API_KEY')
  }

  // 使用 Gemini 3.0 模型
  // 默认使用 gemini-3.0-pro，如果不可用可以尝试：
  // - gemini-3.0-flash（更快）
  // - gemini-1.5-pro（稳定版本）
  // - gemini-pro（通用版本）
  // 可以通过环境变量 GEMINI_MODEL 自定义模型名称
  const modelName = process.env.GEMINI_MODEL || 'gemini-3-pro-preview'
  console.log('使用模型:', modelName)
  const model = genAI.getGenerativeModel({ model: modelName })

  const prompt = `你是一个专业的 SVG 动画设计师。根据用户的描述，生成一个完整的、可运行的 SVG 动画代码。

要求：
1. 生成的 SVG 必须是完整的、有效的 XML 代码
2. 必须包含动画效果（使用 <animate>、<animateTransform> 或 CSS 动画）
3. 动画应该流畅、美观
4. 只返回 SVG 代码，不要包含任何解释文字或 markdown 代码块标记
5. SVG 应该居中显示，适合在网页中展示

用户描述：${description}

请生成 SVG 代码：`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    let svgCode = response.text()

    // 清理可能的 markdown 代码块标记
    svgCode = svgCode.replace(/```svg\n?/g, '').replace(/```\n?/g, '').trim()

    // 验证 SVG 代码
    if (!svgCode.includes('<svg')) {
      throw new Error('生成的代码不是有效的 SVG')
    }

    return svgCode
  } catch (error: any) {
    console.error('Gemini API 错误:', error)
    
    // 提供更详细的错误信息
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('401')) {
      throw new Error('API Key 无效，请检查 GOOGLE_AI_API_KEY 是否正确')
    } else if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
      throw new Error('网络连接失败，请检查网络连接或代理设置')
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      throw new Error('API 调用次数超限，请稍后再试')
    } else {
      throw new Error(`生成 SVG 失败: ${error.message || '未知错误'}`)
    }
  }
}

