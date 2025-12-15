import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 查询用户的任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // 可选：过滤状态
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const where: any = { userId }
    if (status) {
      where.status = status
    }

    // 清理过期任务
    const expiredTasks = await prisma.task.updateMany({
      where: {
        userId,
        status: { in: ['pending', 'processing'] },
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
        error: '任务已过期（超过 30 分钟）',
      },
    })

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({
      tasks: tasks.map((task) => ({
        taskId: task.id,
        type: task.type,
        status: task.status,
        description: task.description,
        inputImageUrls: JSON.parse(task.inputImageUrls),
        resultImageUrl: task.resultImageUrl,
        resultAssetId: task.resultAssetId,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        expiresAt: task.expiresAt,
      })),
      total,
      expiredCleaned: expiredTasks.count,
    })
  } catch (error: any) {
    console.error('查询任务列表错误:', error)
    return NextResponse.json({ error: error.message || '查询任务列表失败' }, { status: 500 })
  }
}

