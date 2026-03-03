import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isComicEnabled } from '@/lib/config/comic'
import { comicGenerationService } from '@/lib/services/comic-generation'
import { uploadImageBufferToVercelBlob } from '@/lib/storage/vercel-blob'

const COMIC_TASK_EXPIRES_MINUTES = 30

/**
 * 漫画生成 API
 * POST /api/comic - 创建新的漫画生成任务（使用 Task，type='comic'）
 * 文生漫功能关闭（COMIC_ENABLED 不为 true）时返回 503。
 */
export async function POST(request: NextRequest) {
  try {
    if (!isComicEnabled()) {
      return NextResponse.json(
        { error: '功能未启用，请联系管理员，微信号为LukePanYY' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { articleUrl, userId } = body

    if (!articleUrl) {
      return NextResponse.json({ error: '缺少文章链接' }, { status: 400 })
    }

    // 验证 URL 格式
    try {
      const urlObj = new URL(articleUrl)
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

    const expiresAt = new Date(Date.now() + COMIC_TASK_EXPIRES_MINUTES * 60 * 1000)
    const description = JSON.stringify({ articleUrl })

    const task = await prisma.task.create({
      data: {
        userId,
        type: 'comic',
        status: 'pending',
        description,
        inputImageUrls: '[]',
        expiresAt,
      },
    })

    executeComicGeneration(task.id, articleUrl).catch(console.error)

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      message: '任务已创建，正在处理中',
    })
  } catch (error) {
    console.error('创建漫画任务失败:', error)
    return NextResponse.json(
      { error: '创建任务失败，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * 异步执行漫画生成任务
 */
async function executeComicGeneration(taskId: string, articleUrl: string) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'processing' },
    })

    const result = await comicGenerationService.generateComic(articleUrl)
    let resultImageUrl = result.imageUrl
    if (resultImageUrl.startsWith('data:')) {
      const match = resultImageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
      if (match) {
        const [, mimeType, base64] = match
        try {
          const buffer = Buffer.from(base64, 'base64')
          const { url } = await uploadImageBufferToVercelBlob({
            buffer,
            mimeType: mimeType || 'image/png',
            prefix: 'comic',
          })
          resultImageUrl = url
        } catch (uploadErr: unknown) {
          console.warn('Vercel Blob 上传失败，使用 data URL 保存:', (uploadErr as Error)?.message)
          // Blob 未配置或 store 不存在时保留 data URL，任务仍算成功
        }
      }
    }
    const description = JSON.stringify({
      articleUrl,
      articleTitle: result.title,
    })

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        description,
        resultImageUrl,
      },
    })
    console.log('[comic] 任务完成，图片已保存:', resultImageUrl.startsWith('data:') ? 'data URL（Blob 未用）' : 'Blob URL')
  } catch (error: any) {
    console.error('漫画生成失败:', error)
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        error: error.message || '生成失败',
      },
    })
  }
}
