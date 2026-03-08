import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const unauth = await requireAdmin(request)
  if (unauth) return unauth

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)
    const offset = Number(searchParams.get('offset')) || 0
    const action = searchParams.get('action') || undefined

    const where = action ? { action } : undefined

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: { id: true, nickname: true, username: true },
          },
          actor: {
            select: { id: true, nickname: true, username: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      operations: logs,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('获取操作日志错误:', error)
    return NextResponse.json(
      { error: '获取操作日志失败' },
      { status: 500 }
    )
  }
}
