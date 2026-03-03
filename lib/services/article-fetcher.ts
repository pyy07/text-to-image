/**
 * 文章抓取服务
 * 用于从公众号文章链接中提取标题和内容
 * 服务端直接抓取+解析，不请求自身 API，避免 Vercel 上自调用返回 HTML 导致 JSON 解析报错
 */

import * as cheerio from 'cheerio'

export interface ArticleData {
  title: string
  content: string
  url: string
  /** 文章中引用的图片 URL 列表 */
  imageUrls: string[]
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export class ArticleFetcherService {
  /**
   * 从 URL 抓取文章内容（直接请求公众号并解析，不经过自身 API）
   * @param url 公众号文章链接
   */
  async fetchArticle(url: string): Promise<ArticleData> {
    if (!this.isValidWechatArticleUrl(url)) {
      throw new Error('无效的公众号文章链接')
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!response.ok) {
      throw new Error('无法访问文章链接')
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('h1.rich_media_title').text() ||
      '未知标题'

    const contentElement = $('#js_content')
    if (contentElement.length === 0) {
      throw new Error('无法提取文章内容')
    }

    const content = contentElement.text().trim()

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

    return {
      title: title.trim(),
      content,
      url,
      imageUrls,
    }
  }

  private isValidWechatArticleUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return (
        urlObj.hostname === 'mp.weixin.qq.com' ||
        urlObj.hostname === 'www.mp.weixin.qq.com'
      )
    } catch {
      return false
    }
  }

  cleanContent(content: string): string {
    let cleaned = content.replace(/<[^>]*>/g, '')
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    cleaned = cleaned.replace(/&nbsp;/g, ' ')
    cleaned = cleaned.replace(/&amp;/g, '&')
    cleaned = cleaned.replace(/&lt;/g, '<')
    cleaned = cleaned.replace(/&gt;/g, '>')
    cleaned = cleaned.replace(/&quot;/g, '"')
    return cleaned
  }
}

export const articleFetcher = new ArticleFetcherService()
