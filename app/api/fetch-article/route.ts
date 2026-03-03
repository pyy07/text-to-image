import { NextRequest, NextResponse } from 'next/server'
import { articleFetcher } from '@/lib/services/article-fetcher'

/**
 * 文章抓取 API（供前端或其他服务调用）
 * 与文生漫服务端共用 articleFetcher，不自调用本 API，避免线上返回 HTML 导致 JSON 解析失败
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: '缺少文章链接' }, { status: 400 })
    }

    const data = await articleFetcher.fetchArticle(url)
    return NextResponse.json({
      title: data.title,
      content: data.content,
      imageUrls: data.imageUrls,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '抓取文章失败，请稍后重试'
    console.error('抓取文章失败:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
