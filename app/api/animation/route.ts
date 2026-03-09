import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAnimationEnabled, getAnimationGeminiConfig } from '@/lib/config/animation'
import { checkUserUsageLimit } from '@/lib/auth'
import { getAdminFromRequest } from '@/lib/admin-auth'

const ANIMATION_TASK_EXPIRES_MINUTES = 30

/**
 * POST /api/animation - 创建文生动画任务（Task type=animation）
 * 请求体：{ description: string, format?: 'svg' | 'h5', userId?: string }
 * 未开启或未配置时返回 503；创建后异步触发 process，返回 taskId 供轮询
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAnimationEnabled()) {
      return NextResponse.json(
        { error: '文生动画功能未开启（请设置 ANIMATION_ENABLED=true）' },
        { status: 503 }
      )
    }

    const config = getAnimationGeminiConfig()
    if (!config) {
      return NextResponse.json(
        {
          error:
            '文生动画未配置：请设置 OPENAI_UNIAPI_BASE_URL 与 OPENAI_UNIAPI_API_KEY',
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { description, format, userId: rawUserId } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: '描述不能为空' }, { status: 400 })
    }

    const formatVal = format === 'h5' ? 'h5' : 'svg'

    const allowAnonymous =
      process.env.ALLOW_ANONYMOUS === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')
    const isAdmin = !!(await getAdminFromRequest(request))

    if (!isAdmin && !allowAnonymous) {
      if (!rawUserId) {
        return NextResponse.json({ error: '请先登录' }, { status: 401 })
      }
      const usageCheck = await checkUserUsageLimit(rawUserId)
      if (!usageCheck.allowed) {
        return NextResponse.json(
          { error: '使用次数已用完', remaining: usageCheck.remaining },
          { status: 403 }
        )
      }
    }

    const expiresAt = new Date(
      Date.now() + ANIMATION_TASK_EXPIRES_MINUTES * 60 * 1000
    )
    const taskDescription = JSON.stringify({
      userDescription: description.trim(),
      format: formatVal,
    })

    const task = await prisma.task.create({
      data: {
        userId: rawUserId ?? null,
        type: 'animation',
        status: 'pending',
        description: taskDescription,
        inputImageUrls: '[]',
        expiresAt,
        provider: 'gemini',
        model: config.model,
      },
    })

    // 异步触发 process，不阻塞响应
    const origin =
      request.nextUrl.origin ||
      process.env.NEXTAUTH_URL ||
      `https://${process.env.VERCEL_URL || 'localhost:3000'}`
    fetch(`${origin}/api/tasks/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id }),
    }).catch((err) => console.error('[animation] 触发 process 失败:', err))

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      message: '任务已创建，正在处理中',
    })
  } catch (error: any) {
    console.error('创建文生动画任务失败:', error)
    return NextResponse.json(
      { error: error?.message || '创建任务失败，请稍后重试' },
      { status: 500 }
    )
  }
}
