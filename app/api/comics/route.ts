import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取漫画任务列表（Task type='comic'，仅返回一张分镜图）
 * GET /api/comics?page=1&limit=12
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    const tasks = await prisma.task.findMany({
      where: {
        type: 'comic',
        status: 'completed',
        resultImageUrl: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    })

    const comics = tasks.map((task) => {
      let articleUrl: string | null = null
      let articleTitle: string | null = null
      try {
        const desc = JSON.parse(task.description) as { articleUrl?: string; articleTitle?: string }
        articleUrl = desc.articleUrl ?? null
        articleTitle = desc.articleTitle ?? null
      } catch {
        articleUrl = task.description
      }
      // data URL 时返回代理 URL，避免响应过大且前端能正常显示
      const resultImageUrl =
        task.resultImageUrl?.startsWith('data:')
          ? `/api/comic/${task.id}/image`
          : task.resultImageUrl
      return {
        id: task.id,
        articleUrl,
        articleTitle,
        resultImageUrl,
        createdAt: task.createdAt,
        user: task.user,
      }
    })

    return NextResponse.json({ comics })
  } catch (error) {
    console.error('获取漫画列表失败:', error)
    return NextResponse.json(
      { error: '获取漫画列表失败' },
      { status: 500 }
    )
  }
}
