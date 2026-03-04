/**
 * GitHub 仓库 README 抓取服务
 * 仅获取仓库的 README 文件内容，返回与 ArticleData 兼容的结构，供文生漫流程复用。
 */

import type { ArticleData } from './article-fetcher'

const GITHUB_API_BASE = 'https://api.github.com'

export interface GitHubRepoInfo {
  owner: string
  repo: string
}

/**
 * 从 GitHub 仓库 URL 解析出 owner 和 repo。
 * 支持：https://github.com/owner/repo、https://github.com/owner/repo/、.../owner/repo/blob/...
 */
export function parseGitHubRepoUrl(url: string): GitHubRepoInfo | null {
  try {
    const u = new URL(url)
    if (u.hostname !== 'github.com' && u.hostname !== 'www.github.com') return null
    const parts = u.pathname.replace(/^\/+/, '').split('/')
    if (parts.length >= 2) {
      const owner = parts[0]
      const repo = parts[1]
      if (owner && repo && !['blob', 'tree', 'commit', 'releases'].includes(repo)) return { owner, repo }
    }
    return null
  } catch {
    return null
  }
}

export function isValidGitHubRepoUrl(url: string): boolean {
  return parseGitHubRepoUrl(url) !== null
}

export class GitHubFetcherService {
  private getHeaders(accept: string): Record<string, string> {
    const token = process.env.GITHUB_TOKEN?.trim()
    const headers: Record<string, string> = {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
    }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  /**
   * 获取仓库 README，返回与 ArticleData 兼容的数据。
   * 仅拉取 README 文件内容；README 中的图片链接会解析为绝对 URL。
   */
  async fetchReadme(repoUrl: string): Promise<ArticleData> {
    const info = parseGitHubRepoUrl(repoUrl)
    if (!info) throw new Error('无效的 GitHub 仓库链接')

    const { owner, repo } = info

    // 1. 获取仓库信息（默认分支、描述）
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: this.getHeaders('application/vnd.github+json'),
    })
    if (!repoRes.ok) {
      if (repoRes.status === 404) throw new Error('仓库不存在或无权访问')
      throw new Error(`获取仓库信息失败: ${repoRes.status}`)
    }
    const repoJson = (await repoRes.json()) as { default_branch?: string; description?: string | null }
    const defaultBranch = repoJson.default_branch ?? 'main'
    const description = typeof repoJson.description === 'string' ? repoJson.description : ''

    // 2. 获取 README 原始内容（Accept: raw）
    const readmeRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme?ref=${defaultBranch}`,
      { headers: this.getHeaders('application/vnd.github.raw+json') }
    )
    if (!readmeRes.ok) {
      if (readmeRes.status === 404) throw new Error('该仓库没有 README 文件')
      throw new Error(`获取 README 失败: ${readmeRes.status}`)
    }

    const readmeText = await readmeRes.text()

    const title = description ? `${repo} - ${description}` : `${owner}/${repo}`

    const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}`
    const imageUrls = this.extractImageUrlsFromMarkdown(readmeText, rawBase)

    return {
      title: title.trim(),
      content: readmeText,
      url: repoUrl,
      imageUrls,
    }
  }

  /**
   * 从 Markdown 中提取图片 URL。相对路径转为 raw.githubusercontent.com 绝对 URL。
   */
  private extractImageUrlsFromMarkdown(markdown: string, rawBase: string): string[] {
    const urls: string[] = []
    const seen = new Set<string>()
    // ![alt](path) 或 ![](path)
    const re = /!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(markdown)) !== null) {
      const path = m[2].trim()
      if (!path || path.startsWith('http://') || path.startsWith('https://')) {
        if (path && !seen.has(path)) {
          seen.add(path)
          urls.push(path)
        }
        continue
      }
      const normalized = path.startsWith('/') ? path.slice(1) : path
      const absolute = `${rawBase.replace(/\/$/, '')}/${normalized}`
      if (!seen.has(absolute)) {
        seen.add(absolute)
        urls.push(absolute)
      }
    }
    return urls
  }
}

export const githubFetcher = new GitHubFetcherService()
