import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAllowDelete } from '@/lib/config/features'

/** 禁止 Next 缓存本路由，确保每次轮询都读最新 DB */
export const dynamic = 'force-dynamic'

/**
 * 查询漫画任务状态（Task type='comic'）
 * GET /api/comic/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id
    const task = await prisma.task.findFirst({
      where: { id: taskId, type: 'comic' },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    let articleUrl: string | undefined
    let articleTitle: string | undefined
    try {
      const desc = JSON.parse(task.description) as { articleUrl?: string; articleTitle?: string }
      articleUrl = desc.articleUrl
      articleTitle = desc.articleTitle
    } catch {
      articleUrl = task.description
    }

    // 若结果为 data URL（Blob 未配置），返回代理 URL 避免 JSON 体积过大导致前端不显示
    const resultImageUrl =
      task.resultImageUrl?.startsWith('data:')
        ? `/api/comic/${taskId}/image`
        : (task.resultImageUrl ?? undefined)

    console.log('[comic] GET taskId=%s 返回 status=%s hasResultImageUrl=%s', taskId, task.status, !!resultImageUrl)
    return NextResponse.json(
      {
        id: task.id,
        status: task.status,
        articleUrl,
        articleTitle,
        resultImageUrl,
        error: task.error ?? undefined,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    )
  } catch (error) {
    console.error('查询任务失败:', error)
    return NextResponse.json(
      { error: '查询任务失败，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * 删除漫画案例（仅当 COMIC_ALLOW_DELETE=true 时允许）
 * DELETE /api/comic/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAllowDelete()) {
      return NextResponse.json(
        { error: '当前未开启案例删除功能' },
        { status: 403 }
      )
    }
    const taskId = params.id
    const task = await prisma.task.findFirst({
      where: { id: taskId, type: 'comic' },
    })
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }
    await prisma.task.delete({ where: { id: taskId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('删除漫画案例失败:', error)
    return NextResponse.json(
      { error: '删除失败，请稍后重试' },
      { status: 500 }
    )
  }
}
