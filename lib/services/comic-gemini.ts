/**
 * 文生漫：使用 @google/genai SDK 多图+文生图
 * 将公众号文章配图下载为 base64，与正文一起作为多模态输入，调用 generateContent 生成九宫格漫画。
 * 通过 httpOptions.baseUrl 支持 UniAPI（如 https://api.uniapi.io/gemini）或 Google 官方。
 * 文生漫使用 UniAPI 配置（OPENAI_UNIAPI_BASE_URL 推导 .../gemini + OPENAI_UNIAPI_API_KEY）。
 */

import { GoogleGenAI } from '@google/genai'
import type { ComicGeminiConfig } from '@/lib/config/comic'

/** 文章配图最多传入张数，过多会增大请求体积并可能触发 API 限制 */
const MAX_IMAGES = 12

/** Gemini 支持的图片 MIME（不支持 SVG 等矢量格式） */
const GEMINI_SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]

function isSupportedImageMime(mimeType: string): boolean {
  const base = mimeType.split(';')[0].trim().toLowerCase()
  return GEMINI_SUPPORTED_IMAGE_TYPES.includes(base)
}

export interface GeminiImagePart {
  mimeType: string
  data: string // base64
}

/**
 * 将图片 URL 下载并转为 Gemini 可用的 inlineData（base64）
 * 最多保留 MAX_IMAGES 张；SVG 等不支持的格式会跳过，失败的单张跳过
 */
export async function downloadImagesForGemini(
  imageUrls: string[]
): Promise<GeminiImagePart[]> {
  const urls = imageUrls.slice(0, MAX_IMAGES)
  const results = await Promise.allSettled(
    urls.map(async (url): Promise<GeminiImagePart> => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: { Accept: 'image/*' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const mimeType = blob.type || 'image/png'
      if (!mimeType.startsWith('image/')) throw new Error('非图片类型')
      if (!isSupportedImageMime(mimeType)) throw new Error(`不支持的图片格式: ${mimeType}`)
      const buf = await blob.arrayBuffer()
      const base64 = Buffer.from(buf).toString('base64')
      return { mimeType: mimeType.split(';')[0].trim(), data: base64 }
    })
  )
  const out: GeminiImagePart[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') out.push(r.value)
  }
  return out
}

/**
 * 使用 @google/genai 调用 Gemini generateContent：多图+文本 → 生成一张图
 * baseUrl 可配置为 UniAPI（如 https://api.uniapi.io/gemini）或 Google 官方地址。
 */
export async function generateComicWithGemini(
  config: ComicGeminiConfig,
  prompt: string,
  imageParts: GeminiImagePart[]
): Promise<{ imageUrl: string; mimeType?: string }> {
  const baseURL = config.baseURL.replace(/\/$/, '')
  const model = config.model.replace(/^models\//, '')

  const ai = new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: {
      baseUrl: baseURL,
    },
  })

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: prompt },
  ]
  for (const img of imageParts) {
    parts.push({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })
  }

  const requestParams = {
    model,
    contents: parts.map((p) =>
      p.text
        ? { text: p.text }
        : p.inlineData
          ? { inlineData: { mimeType: p.inlineData.mimeType, dataLength: p.inlineData.data?.length ?? 0 } }
          : p
    ),
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '1K',
      },
    },
  }
  console.log('[comic-gemini] 使用模型:', model)
  console.log('[comic-gemini] generateContent 入参:', JSON.stringify({
    model: requestParams.model,
    config: requestParams.config,
    contentsSummary: requestParams.contents,
    promptLength: prompt.length,
    imagePartsCount: imageParts.length,
  }, null, 2))

  const response = await ai.models.generateContent({
    model: requestParams.model,
    contents: parts,
    config: requestParams.config,
  })

  // 打印响应结构（便于排查解析不到图片的问题）
  const c0 = response.candidates?.[0]
  const finishReason = (c0 as { finishReason?: string } | undefined)?.finishReason
  if (finishReason === 'NO_IMAGE' || (finishReason && !response.data && !(c0?.content?.parts?.length))) {
    throw new Error(
      '当前模型未返回图片（finishReason: NO_IMAGE）。请确认 COMIC_GEMINI_MODEL（或默认模型）使用支持出图的模型（如 gemini-2.0-flash-exp），并确认 UniAPI 已开启图片生成能力。'
    )
  }
  const firstPart = c0?.content?.parts?.[0]
  const respForLog = {
    hasData: !!response.data,
    dataLength: typeof response.data === 'string' ? response.data.length : 0,
    candidatesLength: response.candidates?.length ?? 0,
    firstCandidatePartsLength: c0?.content?.parts?.length ?? 0,
    firstCandidateKeys: c0 ? Object.keys(c0 as object) : [],
    contentKeys: c0?.content ? Object.keys(c0.content as object) : [],
    firstPartKeys: firstPart ? Object.keys(firstPart as object) : [],
    firstPartShape: firstPart
      ? Object.fromEntries(
          Object.entries(firstPart as object).map(([k, v]) => [
            k,
            typeof v === 'string' ? (v.length > 100 ? `string(${v.length})` : v) : typeof v === 'object' && v && 'data' in (v as object) ? `{data:${((v as { data?: string }).data?.length ?? 0)}chars}` : v,
          ])
        )
      : null,
  }
  console.log('[comic-gemini] generateContent 响应摘要:', JSON.stringify(respForLog, null, 2))
  // 打印 candidate[0] 完整结构（base64 替换为长度，避免刷屏）
  if (c0) {
    const truncated = JSON.stringify(
      c0,
      (_, v) => (typeof v === 'string' && v.length > 200 ? `[string ${v.length} chars]` : v),
      2
    )
    console.log('[comic-gemini] candidate[0] 结构:', truncated.slice(0, 2000))
  }

  const data = response.data
  if (data) {
    const mime = 'image/png'
    return {
      imageUrl: `data:${mime};base64,${data}`,
      mimeType: mime,
    }
  }

  const candidates = response.candidates
  const partsOut = candidates?.[0]?.content?.parts
  if (Array.isArray(partsOut)) {
    for (const part of partsOut) {
      const p = part as Record<string, unknown>
      const raw = (p.inlineData as { mimeType?: string; data?: string } | undefined) ?? (p.inline_data as { mime_type?: string; data?: string } | undefined)
      if (!raw?.data) continue
      const mime = (raw as { mimeType?: string }).mimeType ?? (raw as { mime_type?: string }).mime_type ?? 'image/png'
      return {
        imageUrl: `data:${mime};base64,${raw.data}`,
        mimeType: mime,
      }
    }
  }

  // 尝试从 SDK 原始 HTTP 响应解析（部分代理返回结构与 SDK 解析不一致）
  const sdkRes = (response as { sdkHttpResponse?: { json?: () => Promise<unknown> } }).sdkHttpResponse
  if (sdkRes?.json) {
    try {
      const rawBody = await sdkRes.json()
      if (rawBody && typeof rawBody === 'object') {
        const bodyStr = JSON.stringify(
          rawBody,
          (_, v) => (typeof v === 'string' && v.length > 200 ? `[base64 ${v.length}]` : v)
        )
        console.log('[comic-gemini] 原始响应 body 摘要:', bodyStr.slice(0, 2000))
      }
      type Part = { inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }
      const typedBody = (rawBody ?? {}) as { candidates?: Array<{ content?: { parts?: Part[] } }> }
      const rawParts = typedBody.candidates?.[0]?.content?.parts
      if (Array.isArray(rawParts)) {
        for (const part of rawParts) {
          const raw = part?.inlineData ?? part?.inline_data
          if (raw?.data) {
            const mime = ('mimeType' in raw ? raw.mimeType : (raw as { mime_type?: string }).mime_type) ?? 'image/png'
            return {
              imageUrl: `data:${mime};base64,${raw.data}`,
              mimeType: mime,
            }
          }
        }
      }
    } catch (e) {
      console.warn('[comic-gemini] 从 sdkHttpResponse 解析失败:', e)
    }
  }

  // 兜底：在 response 整棵树中递归查找含 data（base64）的节点（代理可能放在任意层级）
  function findInlineData(obj: unknown, depth: number): { data: string; mimeType?: string } | null {
    if (depth > 10 || obj == null) return null
    if (typeof obj === 'object' && 'data' in obj && typeof (obj as { data: unknown }).data === 'string') {
      const d = (obj as { data: string; mimeType?: string; mime_type?: string })
      const data = d.data
      if (data.length > 100) {
        return { data, mimeType: d.mimeType ?? d.mime_type ?? 'image/png' }
      }
    }
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = findInlineData(item, depth + 1)
        if (found) return found
      }
    } else if (obj && typeof obj === 'object') {
      for (const v of Object.values(obj)) {
        const found = findInlineData(v, depth + 1)
        if (found) return found
      }
    }
    return null
  }
  const found = findInlineData(response, 0)
  if (found) {
    return {
      imageUrl: `data:${found.mimeType ?? 'image/png'};base64,${found.data}`,
      mimeType: found.mimeType ?? 'image/png',
    }
  }

  console.error('[comic-gemini] 完整 response 键:', response ? Object.keys(response) : [])
  throw new Error('Gemini 返回中未解析到生成图片（inlineData）')
}
