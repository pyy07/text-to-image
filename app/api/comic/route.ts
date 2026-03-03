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

    console.log('[comic] 创建任务 taskId=%s 已入库，异步执行 executeComicGeneration', task.id)
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
 * 异步执行漫画生成任务。成功时必定将 task 置为 completed，异常时置为 failed，避免卡在 processing。
 */
async function executeComicGeneration(taskId: string, articleUrl: string) {
  console.log('[comic] executeComicGeneration 开始 taskId=%s articleUrl=%s', taskId, articleUrl)
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'processing' },
    })
    console.log('[comic] taskId=%s 已设为 processing', taskId)

    const result = await comicGenerationService.generateComic(articleUrl)
    const hasImage = typeof result?.imageUrl === 'string' && result.imageUrl.trim().length > 0
    console.log('[comic] taskId=%s generateComic 返回 title=%s imageUrl存在=%s length=%s', taskId, result?.title ?? '', hasImage, hasImage ? String(result!.imageUrl.length) : '0')
    if (!hasImage) {
      throw new Error('生成服务未返回有效图片地址')
    }
    let resultImageUrl = result!.imageUrl.trim()

    if (resultImageUrl.startsWith('data:')) {
      const match = resultImageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
      if (match) {
        const [, mimeType, base64] = match
        try {
          console.log('[comic] taskId=%s 尝试 Blob 上传 base64Len=%s', taskId, base64?.length ?? 0)
          const buffer = Buffer.from(base64, 'base64')
          const { url } = await uploadImageBufferToVercelBlob({
            buffer,
            mimeType: mimeType || 'image/png',
            prefix: 'comic',
          })
          resultImageUrl = url
          console.log('[comic] taskId=%s Blob 上传成功 url=%s', taskId, url)
        } catch (uploadErr: unknown) {
          console.warn('[comic] taskId=%s Vercel Blob 上传失败，使用 data URL 保存:', taskId, (uploadErr as Error)?.message)
          // Blob 未配置或 store 不存在时保留 data URL，任务仍算成功
        }
      }
    }

    const description = JSON.stringify({
      articleUrl,
      articleTitle: result!.title ?? '',
    })
    console.log('[comic] taskId=%s 即将写入 DB status=completed resultImageUrl类型=%s', taskId, resultImageUrl.startsWith('data:') ? 'dataURL' : 'blobURL')
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        description,
        resultImageUrl,
      },
    })
    const verify = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true } })
    console.log('[comic] taskId=%s 已写入 completed，同进程校验 status=%s', taskId, verify?.status ?? 'null')
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('[comic] taskId=%s 异常:', taskId, err.message, err)
    try {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          error: err.message || '生成失败',
        },
      })
      console.log('[comic] taskId=%s 已写入 failed error=%s', taskId, err.message)
    } catch (updateErr) {
      console.error('[comic] taskId=%s 更新为 failed 时出错:', taskId, updateErr)
    }
  }
}
