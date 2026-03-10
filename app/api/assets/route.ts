import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const userOnly = searchParams.get('userOnly') === 'true'
    const publicOnly = searchParams.get('publicOnly') === 'true' // 案例页面：只显示公开的（无userId）
    const trialOnly = searchParams.get('trialOnly') === 'true' // 试用案例：只显示 type=trial
    const excludeTrial = searchParams.get('excludeTrial') === 'true' // 图片案例：排除试用素材
    const q = (searchParams.get('q') || '').trim()
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = (page - 1) * limit

    let where: any = {}
    
    if (trialOnly) {
      where = { type: 'trial' }
    } else if (publicOnly) {
      // 案例页面：只显示公开的（userId为null）；图片案例排除试用与文生动画
      where = { userId: null }
      if (excludeTrial) {
        where.type = { not: 'trial' }
        // 图片案例不展示文生动结果，动画案例由 /api/animations 单独拉取
        where.operation = { not: 'animation' }
      }
    } else if (userOnly && userId) {
      // 我的素材页面：只显示当前用户的图片，并且必须有userId
      where = { userId }
    }

    if (q.length > 0) {
      where.description = { contains: q, mode: 'insensitive' }
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ])

    return NextResponse.json({
      assets,
      total,
      page,
      limit,
      hasMore: skip + assets.length < total,
    })
  } catch (error) {
    console.error('获取素材列表错误:', error)
    return NextResponse.json(
      { error: '获取素材列表失败' },
      { status: 500 }
    )
  }
}

