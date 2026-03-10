/**
 * 文生动画：根据用户文本描述生成 SVG 或 H5 动画代码
 * 使用 UniAPI Gemini（可配置模型，默认 gemini-3-flash-preview），采用结构化提示词驱动输出
 */

import { GoogleGenAI } from '@google/genai'
import type { AnimationGeminiConfig } from '@/lib/config/animation'

export type AnimationFormat = 'svg' | 'h5'

const ROLE_AND_MISSION = `# ROLE
你是一位资深动画与动效设计师，产出可直接用于展示或教学的高质量动画。你擅长：把抽象描述转化为视觉清晰、动效流畅、配色舒适的成品；使用 SVG SMIL/CSS 或 HTML5+CSS/JS 实现；兼顾信息层次与观赏性。

# MISSION
根据用户描述生成一段可直接使用、观感专业的动画代码。只输出代码本身，不要解释性文字。代码必须完整、可独立运行，且视觉上达到「可直接对外展示」的水准。想象你正在为一家顶级科技公司的官网设计动效插画，每一像素的偏移和每一毫秒的停顿都要经过考究。`

const OUTPUT_RULES = `
# OUTPUT FORMAT
- 你必须且仅输出一个代码块，使用以下标记包裹：
  \`\`\`{lang}
  （你的完整代码）
  \`\`\`
- 不要在任何代码块之外添加说明、注释或多余文字。`

const VISUAL_QUALITY_SVG = `# VISUAL QUALITY & MOTION DESIGN（视觉与动效，必须满足）
- 配色方案：必须遵循 60-30-10 原则（主色、辅助色、强调色）。推荐使用 Material Design 或 Tailwind 系调色盘，确保视觉高级感；背景与前景对比清晰。
- 动效深度：
  - 拒绝单一维度的移动。尝试组合「位移+缩放+透明度」的三位一体入场。
  - 使用贝塞尔曲线实现丝滑感（如 cubic-bezier(0.4, 0, 0.2, 1)）；在元素位移时加入微小的弹性回弹（Elastic Out）或减速效果，避免机械的线性移动。
  - 节奏感：使用 Stagger（交错）效果，多个同类元素不要同时动，而是间隔约 0.1s 依次动。
- 路径动画：优先使用 stroke-dasharray/stroke-dashoffset 实现线条生长动画，增加科技感。
- 布局与响应式：SVG 内部元素应尽量相对于 viewBox 中心或关键参考点对齐；留白适中，重要信息（标题、公式、图例）层次分明。
- 细节增强：在背景层可添加极淡的网格点（Dots）或渐变色块，提升画面层次。
- 文字：关键文字清晰可读，字号有主次；若含公式或标签，务必工整、对齐。
- 整体：观感现代、简洁，像可直接用于课件或产品演示的成品。`

function buildSvgPrompt(userDescription: string): string {
  return `${ROLE_AND_MISSION}

# OUTPUT TYPE
- 输出格式：单文件 SVG，内嵌 SMIL 或 CSS 动画（\<style\> 内 keyframes 或 \<animate\>/\<animateTransform\>）。
- 根元素为 \<svg\>，需包含 xmlns="http://www.w3.org/2000/svg"，视口合理（如 viewBox="0 0 400 300"）。viewBox 与内容对齐，内部元素尽量相对于 viewBox 中心或参考点布局，便于在不同容器下居中显示。
- 动画必须循环播放：SMIL 使用 repeatCount="indefinite"，CSS 使用 animation-iteration-count: infinite。单次循环时长 8–12 秒，留出足够时间展示过程。
- 禁止占位与简写：禁止在代码中使用任何形式的注释占位（如 TODO、省略号等）；所有图形必须由真实的 \<path\>、\<circle\>、\<rect\> 等标签完整绘制，不允许使用极其简单的占位方块或空白占位。
- 过程感：动画要有清晰的「过程」——例如分步出现、依次展开、先示意再结论等，避免一帧到位或仅 1–2 秒就结束；用时间轴分阶段（如 0–30% 引入、30–70% 展开、70–100% 收尾）让观者能跟上节奏。
- 细节与过程：尽量渲染更多细节与过程——每一阶段都要有对应的视觉变化（图形、颜色、文字、位置等），步骤拆得细、展示得充分，避免只有少量元素在动或过程过于简略。
- 过程与动画联动：逻辑步骤（如步骤一、二、三）与画面动效一一对应：展示某一步时，画面只呈现或高亮该步内容；进入下一步时，画面同步切换或叠加，让观者能清楚看到「当前是哪一步、画面正在发生什么」。
- 可访问性：适当使用 \<title\> 或 aria-label 描述动画内容。

${VISUAL_QUALITY_SVG}

# TECHNICAL CONSTRAINTS
- 仅输出合法、可被浏览器直接渲染的 SVG 源码。
- 不引用外部资源；所有样式与动画定义在文件内。
- XML/SVG 中 & 必须转义为 &amp;（例如 URL 或属性里的 & 一律写成 &amp;），否则浏览器会报 xmlParseEntityRef 无法渲染。
${OUTPUT_RULES.replace('{lang}', 'svg')}

---

【用户描述】
${userDescription}

请根据以上描述与视觉要求生成 SVG 动画代码。在保证内容正确的前提下，优先让配色、布局和动效达到可直接展示的成品水准。只输出一个 \`\`\`svg 代码块，不要其他内容。`
}

function buildH5Prompt(userDescription: string): string {
  return `${ROLE_AND_MISSION}

# OUTPUT TYPE
- 输出格式：单文件 HTML5 文档，包含 \<!DOCTYPE html\>，动画通过内联 \<style\> 中的 CSS（keyframes）或内联 \<script\> 中的 JavaScript 实现。
- 结构：\<html\>/\<head\>/\<body\> 完整，动画元素在 body 内；可选用 \<canvas\> 或 DOM+CSS/JS。HTML5 格式需默认将动画容器居中（如 Flex 居中），并使用 overflow: hidden 防止滚动条出现。
- 动画必须循环播放：CSS 使用 animation-iteration-count: infinite，JS 动画结束时重新开始或 loop。单次循环时长 8–18 秒，留出足够时间展示过程；移动端友好。
- 若使用 Canvas 绘图，必须在每一帧正确执行 clearRect 再绘制，避免重影。若使用 JS 驱动动画，请优先使用 requestAnimationFrame 而非 setInterval，以确保 60FPS 的流畅度。
- 禁止占位与简写：禁止在代码中使用任何形式的注释占位（如 TODO 等）；所有图形必须由真实绘制逻辑完成，不允许使用极其简单的占位方块。
- 过程感：动画要有清晰「过程」——分步出现、依次展开、先示意再结论等，避免一帧到位或过短；用时间分阶段（如 0–30% 引入、30–70% 展开、70–100% 收尾）让观者能跟上节奏。
- 细节与过程：尽量渲染更多细节与过程——每一阶段都要有对应的视觉变化（图形、颜色、文字、位置等），步骤拆得细、展示得充分，避免只有少量元素在动或过程过于简略。
- 过程与动画联动：逻辑步骤（如步骤一、二、三）与画面动效一一对应：展示某一步时，画面只呈现或高亮该步内容；进入下一步时，画面同步切换或叠加，让观者能清楚看到「当前是哪一步、画面正在发生什么」。
- 可访问性：关键动画区域可加 aria-label 或 role。

# VISUAL QUALITY & MOTION DESIGN（视觉与动效，必须满足）
- 配色：遵循 60-30-10 原则（主色、辅助色、强调色），背景与内容对比清晰；避免刺眼或杂乱配色。
- 布局：容器居中、留白适中、对齐与重心平衡；标题/重点信息层次分明；overflow: hidden 避免滚动条。
- 动效：使用贝塞尔曲线（如 cubic-bezier(0.4, 0, 0.2, 1)）与弹性/减速感，有阶段性（过程感）；可配合 Stagger 交错入场；节奏清晰，循环衔接自然。
- 整体：观感现代、简洁，可直接用于展示或教学。

# TECHNICAL CONSTRAINTS
- 仅输出合法、可被浏览器直接打开的 HTML 源码；不依赖外部 CDN（若必须可引用常见 CDN，但优先内联）。
- 所有 CSS/JS 内联在同一文件内。
${OUTPUT_RULES.replace('{lang}', 'html')}

---

【用户描述】
${userDescription}

请根据以上描述与视觉要求生成 HTML5 动画代码。在保证内容正确的前提下，优先让配色、布局和动效达到可直接展示的成品水准。只输出一个 \`\`\`html 代码块，不要其他内容。`
}

export function buildAnimationPrompt(userDescription: string, format: AnimationFormat): string {
  return format === 'svg' ? buildSvgPrompt(userDescription) : buildH5Prompt(userDescription)
}

/** 从模型返回文本中提取代码块内容（```svg 或 ```html ... ```）；跳过首行语言标识或文件名 */
export function extractCodeBlock(text: string, format: AnimationFormat): string {
  const lang = format === 'svg' ? 'svg' : 'html'
  // 匹配开头的 ```lang 及可能的首行（如文件名），从第二行开始截取到闭合 ```
  const regex = new RegExp(`\`\`\`(?:${lang})?[^\\n]*\\n([\\s\\S]*?)\`\`\``, 'i')
  const match = text.match(regex)
  if (match && match[1]) {
    return match[1].trim()
  }
  // 兼容：无首行换行时仍按整块捕获
  const fallbackRegex = new RegExp(`\`\`\`(?:${lang})?\\s*([\\s\\S]*?)\`\`\``, 'i')
  const fallback = text.match(fallbackRegex)
  if (fallback && fallback[1]) {
    return fallback[1].trim()
  }
  // 容错：若没有代码块，尝试取首尾 <svg 或 <!DOCTYPE 到文件末尾
  const trimmed = text.trim()
  if (format === 'svg') {
    const svgStart = trimmed.indexOf('<svg')
    if (svgStart !== -1) {
      const close = trimmed.lastIndexOf('</svg>')
      if (close !== -1) return trimmed.slice(svgStart, close + 6).trim()
      return trimmed.slice(svgStart).trim()
    }
  } else {
    const docStart = trimmed.indexOf('<!DOCTYPE')
    if (docStart !== -1) return trimmed.slice(docStart).trim()
    const htmlStart = trimmed.indexOf('<html')
    if (htmlStart !== -1) return trimmed.slice(htmlStart).trim()
  }
  return trimmed
}

/**
 * 修复 SVG/XML 中未转义的 &，避免 xmlParseEntityRef: no name
 * 将不在合法实体（&amp; &lt; &gt; &quot; &apos; &#123; &#x7B;）内的 & 替换为 &amp;
 */
function sanitizeSvgForXml(content: string): string {
  return content.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;')
}

export interface GenerateAnimationResult {
  content: string
  format: AnimationFormat
}

/**
 * 调用 UniAPI Gemini 生成动画代码（纯文本，不请求图片）
 */
export async function generateAnimationWithGemini(
  config: AnimationGeminiConfig,
  userDescription: string,
  format: AnimationFormat
): Promise<GenerateAnimationResult> {
  const baseURL = config.baseURL.replace(/\/$/, '')
  const model = config.model.replace(/^models\//, '')

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: { baseUrl: baseURL },
  })

  const prompt = buildAnimationPrompt(userDescription, format)

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })

  const rawText =
    (response as { text?: string }).text ??
    (response.candidates?.[0] as { content?: { parts?: Array<{ text?: string }> } } | undefined)?.content?.parts?.[0]?.text ??
    ''

  if (!rawText || !rawText.trim()) {
    throw new Error('模型未返回有效内容，请重试或更换描述')
  }

  let content = extractCodeBlock(rawText, format)
  if (!content) {
    throw new Error('无法从模型输出中解析出动画代码，请重试')
  }

  if (format === 'svg') {
    content = sanitizeSvgForXml(content)
  }

  return { content, format }
}
