import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

/**
 * 文章抓取 API
 * 用于从公众号文章链接中提取标题和内容
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: '缺少文章链接' }, { status: 400 })
    }

    // 验证 URL 格式
    try {
      const urlObj = new URL(url)
      if (
        urlObj.hostname !== 'mp.weixin.qq.com' &&
        urlObj.hostname !== 'www.mp.weixin.qq.com'
      ) {
        return NextResponse.json(
          { error: '仅支持微信公众号文章链接' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json({ error: '无效的 URL 格式' }, { status: 400 })
    }

    // 抓取文章内容
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: '无法访问文章链接' },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // 提取标题
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('h1.rich_media_title').text() ||
      '未知标题'

    // 提取内容
    const contentElement = $('#js_content')
    if (contentElement.length === 0) {
      return NextResponse.json(
        { error: '无法提取文章内容' },
        { status: 404 }
      )
    }

    // 清理内容（纯文本）
    const content = contentElement.text().trim()

    // 提取文中图片 URL（优先 data-src，公众号常用懒加载）
    const imageUrls: string[] = []
    contentElement.find('img').each((_, el) => {
      const $el = $(el)
      const src =
        $el.attr('data-src') || $el.attr('data-echo') || $el.attr('src') || ''
      if (!src || !src.startsWith('http')) return
      try {
        const absolute = new URL(src, url).href
        if (!imageUrls.includes(absolute)) imageUrls.push(absolute)
      } catch {
        // 忽略无效 URL
      }
    })

    return NextResponse.json({
      title: title.trim(),
      content: content,
      imageUrls,
    })
  } catch (error) {
    console.error('抓取文章失败:', error)
    return NextResponse.json(
      { error: '抓取文章失败，请稍后重试' },
      { status: 500 }
    )
  }
}
