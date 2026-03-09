import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAllowDelete } from '@/lib/config/features'

/**
 * 删除动画案例（Task type='animation'）
 * DELETE /api/animation/[id]
 * 仅当 ALLOW_DELETE=true 时允许
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await Promise.resolve(params)
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: '无效的 taskId' }, { status: 400 })
    }
    if (!isAllowDelete()) {
      return NextResponse.json(
        { error: '当前未开启案例删除功能' },
        { status: 403 }
      )
    }
    const task = await prisma.task.findFirst({
      where: { id: taskId, type: 'animation' },
    })
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }
    await prisma.task.delete({ where: { id: taskId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('删除动画案例失败:', error)
    return NextResponse.json(
      { error: '删除失败，请稍后重试' },
      { status: 500 }
    )
  }
}
