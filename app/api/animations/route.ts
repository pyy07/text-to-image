import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 获取文生动画任务列表（Task type='animation'，已完成且含结果 URL）
 * GET /api/animations?page=1&limit=12
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const q = (searchParams.get('q') || '').trim()
    const skip = (page - 1) * limit

    const where: any = {
      type: 'animation',
      status: 'completed',
      resultImageUrl: { not: null },
    }
    if (q.length > 0) {
      where.description = { contains: q, mode: 'insensitive' }
    }

    const tasks = await prisma.task.findMany({
      where,
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

    const animations = tasks.map((task) => {
      let userDescription = task.description
      let format: string = 'svg'
      try {
        const parsed = JSON.parse(task.description) as { userDescription?: string; format?: string }
        userDescription = parsed.userDescription ?? task.description
        format = parsed.format === 'h5' ? 'h5' : 'svg'
      } catch {
        // keep defaults
      }
      return {
        id: task.id,
        userDescription,
        format,
        resultImageUrl: task.resultImageUrl,
        createdAt: task.createdAt,
        user: task.user,
      }
    })

    return NextResponse.json({ animations })
  } catch (error) {
    console.error('获取动画案例列表失败:', error)
    return NextResponse.json(
      { error: '获取动画案例列表失败' },
      { status: 500 }
    )
  }
}
