/**
 * 漫画生成服务
 * 将文章内容与文中配图一并提交给模型，由模型自行规划分镜并输出一张九宫格漫画分镜总结图。
 * 产出物仅为一张分镜图片，无摘要与分镜列表。
 * 需 COMIC_ENABLED=true 且配置 COMIC_GEMINI_BASE_URL、COMIC_GEMINI_API_KEY，未配置则直接报错。
 */

import { isComicEnabled, getComicGeminiConfig } from '@/lib/config/comic'
import { getStyleDescription } from '@/lib/constants/comic-styles'
import {
  downloadImagesForGemini,
  generateComicWithGemini,
} from './comic-gemini'
import { articleFetcher } from './article-fetcher'
import { isValidGitHubRepoUrl, githubFetcher } from './github-fetcher'

export interface ComicStyleOptions {
  stylePreset?: string | null
  styleCustom?: string | null
}

export interface ComicGenerationResult {
  title: string
  imageUrl: string
}

export class ComicGenerationService {
  /**
   * 生成漫画：将文章内容与文中引用的图片一并提交给模型，由其规划分镜并输出一张九宫格漫画分镜总结图。
   * 支持微信公众号文章链接或 GitHub 仓库链接（仅使用 README）；可选风格预设与自定义描述。
   * 需 COMIC_ENABLED=true 且配置 COMIC_GEMINI_BASE_URL、COMIC_GEMINI_API_KEY，未配置则报错。
   * @param sourceUrl 文章链接或 GitHub 仓库链接
   * @param styleOptions 可选：stylePreset 预设 id、styleCustom 用户自定义风格描述
   */
  async generateComic(
    sourceUrl: string,
    styleOptions?: ComicStyleOptions
  ): Promise<ComicGenerationResult> {
    if (!isComicEnabled()) {
      throw new Error('文生漫功能未开启（COMIC_ENABLED 未设置为 true）')
    }

    const geminiConfig = getComicGeminiConfig()
    if (!geminiConfig) {
      throw new Error(
        '文生漫未配置 Gemini：请设置 COMIC_GEMINI_BASE_URL 与 COMIC_GEMINI_API_KEY'
      )
    }

    const article = isValidGitHubRepoUrl(sourceUrl)
      ? await githubFetcher.fetchReadme(sourceUrl)
      : await articleFetcher.fetchArticle(sourceUrl)
    const cleanedContent = articleFetcher.cleanContent(article.content)
    const styleDesc = getStyleDescription(
      styleOptions?.stylePreset,
      styleOptions?.styleCustom
    )
    const prompt = this.buildArticleToComicPrompt(
      article.title,
      cleanedContent,
      article.imageUrls,
      styleDesc,
    )

    const imageParts =
      article.imageUrls.length > 0
        ? await downloadImagesForGemini(article.imageUrls)
        : []
    const result = await generateComicWithGemini(
      geminiConfig,
      prompt,
      imageParts,
    )
    console.log('[comic-generation] generateComic 即将返回 title=%s imageUrl长度=%s', article.title, result?.imageUrl?.length ?? 0)
    return {
      title: article.title,
      imageUrl: result.imageUrl,
    }
  }

  /**
   * 构建「文章 + 配图」提交给模型的 prompt：由模型自行规划分镜并输出一张九宫格漫画分镜总结图。
   * @param styleDescription 注入 # GLOBAL STYLE 的风格描述（来自预设或用户自定义）
   */
  private buildArticleToComicPrompt(
    title: string,
    content: string,
    imageUrls: string[],
    styleDescription: string,
  ): string {
    const maxContentLen = 4000
    const truncatedContent =
      content.length > maxContentLen
        ? content.substring(0, maxContentLen) + '...'
        : content

    const maxList = 12
    const imageSection =
      imageUrls.length > 0
        ? `\n\n【文中配图】共 ${imageUrls.length} 张，取前 ${maxList} 张传入供参考；以下为前 ${maxList} 条链接：\n${imageUrls.slice(0, maxList).map((url, i) => `${i + 1}. ${url}`).join('\n')}`
        : ''

    return `# MISSION
将下方文章转化为一页专业、统一的「漫画总结」信息图（类似公众号漫画复盘），输出为一张完整图。

# GLOBAL STYLE
- 风格：${styleDescription}
- 基调：信息清晰、有吸引力。
- 元素：每个分镜内须有表情/对话气泡，以及简短、清晰的手写感说明文字（可置于格内或格下）。
- 语言：所有文字（气泡、说明、标题）必须为清晰可读的中文。

# LAYOUT & STRUCTURE
- 形式：单张完整构图（一页漫画/信息图）。
- 边框：分镜格边界清晰（白边或细黑线），可分格大小不一、形状略有变化。
- 构图：偏漫画分镜感——分格可大小不一、有主次（如一大格配多小格、斜切格、跨格），不必严格对齐网格；可适当错落、重叠或破格，阅读顺序仍要明确（大致从左到右或从上到下），整体有节奏感与动感。

# PANEL CONTENT MAPPING
- 请你根据文章要点自行决定分镜数量与每格内容。
- 每格对应一个关键情节或要点，顺序与文章逻辑一致；可含：引入、要点 1～N、结论/影响等。
- 每格内需有简短说明文字（Caption）与/或对话气泡（Dialogue），内容需为中文且与正文相符。

# TECHNICAL OUTPUT PARAMETERS
- 输出：单张合成图。
- 分辨率：最长边不超过 1024 像素（1K）。

---

【文章标题】
${title}

【文章正文】
${truncatedContent}
${imageSection}

请根据以上内容直接生成这一张漫画分镜总结图，不要只输出文字说明。`
  }
}

// 导出单例
export const comicGenerationService = new ComicGenerationService()
