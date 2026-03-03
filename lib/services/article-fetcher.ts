/**
 * 文章抓取服务
 * 用于从公众号文章链接中提取标题和内容
 */

export interface ArticleData {
  title: string
  content: string
  url: string
  /** 文章中引用的图片 URL 列表 */
  imageUrls: string[]
}

/** 服务端调用时需使用绝对 URL，否则 fetch 会报 Invalid URL */
function getApiBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export class ArticleFetcherService {
  /**
   * 从 URL 抓取文章内容
   * @param url 公众号文章链接
   */
  async fetchArticle(url: string): Promise<ArticleData> {
    try {
      // 验证 URL 格式
      if (!this.isValidWechatArticleUrl(url)) {
        throw new Error('无效的公众号文章链接')
      }

      const baseUrl = getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/fetch-article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '抓取文章失败')
      }

      const data = await response.json()
      return {
        title: data.title,
        content: data.content,
        url: url,
        imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
      }
    } catch (error) {
      console.error('抓取文章失败:', error)
      throw error
    }
  }

  /**
   * 验证是否为有效的公众号文章链接
   */
  private isValidWechatArticleUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      // 检查是否为微信公众号文章域名
      return (
        urlObj.hostname === 'mp.weixin.qq.com' ||
        urlObj.hostname === 'www.mp.weixin.qq.com'
      )
    } catch {
      return false
    }
  }

  /**
   * 清理文章内容，移除 HTML 标签和多余空白
   */
  cleanContent(content: string): string {
    // 移除 HTML 标签
    let cleaned = content.replace(/<[^>]*>/g, '')
    // 移除多余的空白字符
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    // 移除特殊字符
    cleaned = cleaned.replace(/&nbsp;/g, ' ')
    cleaned = cleaned.replace(/&amp;/g, '&')
    cleaned = cleaned.replace(/&lt;/g, '<')
    cleaned = cleaned.replace(/&gt;/g, '>')
    cleaned = cleaned.replace(/&quot;/g, '"')
    return cleaned
  }
}

// 导出单例
export const articleFetcher = new ArticleFetcherService()
