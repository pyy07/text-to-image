/**
 * 漫画生成服务
 * 将文章内容与文中配图一并提交给模型，由模型自行规划分镜并输出一张九宫格漫画分镜总结图。
 * 产出物仅为一张分镜图片，无摘要与分镜列表。
 * 需 COMIC_ENABLED=true 且配置 COMIC_GEMINI_BASE_URL、COMIC_GEMINI_API_KEY，未配置则直接报错。
 */

import { isComicEnabled, getComicGeminiConfig } from '@/lib/config/comic'
import {
  downloadImagesForGemini,
  generateComicWithGemini,
} from './comic-gemini'
import { articleFetcher } from './article-fetcher'

export interface ComicGenerationResult {
  title: string
  imageUrl: string
}

export class ComicGenerationService {
  /**
   * 生成漫画：将文章内容与文中引用的图片一并提交给模型，由其规划分镜并输出一张九宫格漫画分镜总结图。
   * 需 COMIC_ENABLED=true 且配置 COMIC_GEMINI_BASE_URL、COMIC_GEMINI_API_KEY，未配置则报错。
   * @param articleUrl 文章链接
   */
  async generateComic(articleUrl: string): Promise<ComicGenerationResult> {
    if (!isComicEnabled()) {
      throw new Error('文生漫功能未开启（COMIC_ENABLED 未设置为 true）')
    }

    const geminiConfig = getComicGeminiConfig()
    if (!geminiConfig) {
      throw new Error(
        '文生漫未配置 Gemini：请设置 COMIC_GEMINI_BASE_URL 与 COMIC_GEMINI_API_KEY'
      )
    }

    const article = await articleFetcher.fetchArticle(articleUrl)
    const cleanedContent = articleFetcher.cleanContent(article.content)
    const prompt = this.buildArticleToComicPrompt(
      article.title,
      cleanedContent,
      article.imageUrls,
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

    return {
      title: article.title,
      imageUrl: result.imageUrl,
    }
  }

  /**
   * 构建「文章 + 配图」提交给模型的 prompt：由模型自行规划分镜并输出一张九宫格漫画分镜总结图。
   */
  private buildArticleToComicPrompt(
    title: string,
    content: string,
    imageUrls: string[],
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
- 风格：现代数字漫画风，高对比、线条干净，色彩鲜明但偏专业，简约易读。
- 基调：信息清晰、有吸引力。
- 元素：每个分镜内须有表情/对话气泡，以及简短、清晰的手写感说明文字（可置于格内或格下）。
- 语言：所有文字（气泡、说明、标题）必须为清晰可读的中文。

# LAYOUT & STRUCTURE
- 形式：单张完整构图（一页信息图）。
- 边框：分镜格边界清晰（白边或细黑线）。
- 构图：根据文章结构自动排布，可为网格（如 2×2、2×3、3×3）、竖条（1×N）、横排或错落有致的平衡流式布局；整体整齐、有序，阅读顺序明确（如左上到右下）。

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
