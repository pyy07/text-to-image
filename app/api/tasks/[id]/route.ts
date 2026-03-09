import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminFromRequest } from '@/lib/admin-auth'

/**
 * 查询单个任务状态
 * 兼容 Next.js 15 params Promise
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await Promise.resolve(params)
    const userId = request.headers.get('x-user-id')
    const isAdmin = !!(await getAdminFromRequest(request))

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    // 管理员可查看任意任务；否则仅任务创建者可查看
    if (!isAdmin && task.userId && userId !== task.userId) {
      return NextResponse.json({ error: '无权限查看该任务' }, { status: 403 })
    }

    // 检查是否过期
    if (task.status === 'pending' || task.status === 'processing') {
      if (new Date() > task.expiresAt) {
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'expired',
            error: '任务已过期（超过 30 分钟）',
          },
        })
        return NextResponse.json({
          taskId: task.id,
          status: 'expired',
          error: '任务已过期',
        })
      }
    }

    return NextResponse.json({
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
    })
  } catch (error: any) {
    console.error('查询任务错误:', error)
    return NextResponse.json({ error: error.message || '查询任务失败' }, { status: 500 })
  }
}

