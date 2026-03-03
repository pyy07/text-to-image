import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 漫画任务结果图片代理
 * - 若 resultImageUrl 为 data URL（Blob 未配置时），解码后以二进制返回
 * - 若为 http(s) URL，重定向到该地址
 * GET /api/comic/[id]/image
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id

    const task = await prisma.task.findFirst({
      where: { id: taskId, type: 'comic' },
    })

    if (!task || !task.resultImageUrl) {
      return NextResponse.json({ error: '任务或图片不存在' }, { status: 404 })
    }

    const url = task.resultImageUrl

    if (url.startsWith('data:')) {
      const match = url.match(/^data:(image\/[^;]+);base64,(.+)$/)
      if (!match) {
        return NextResponse.json({ error: '无效的 data URL' }, { status: 400 })
      }
      const [, mimeType, base64] = match
      const buffer = Buffer.from(base64, 'base64')
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType || 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // 外链：重定向
    return NextResponse.redirect(url, 302)
  } catch (error) {
    console.error('漫画图片代理失败:', error)
    return NextResponse.json(
      { error: '获取图片失败，请稍后重试' },
      { status: 500 }
    )
  }
}
