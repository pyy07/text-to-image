import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const searchParams = request.nextUrl.searchParams
    const userOnly = searchParams.get('userOnly') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = (page - 1) * limit

    const where = userOnly && userId ? { userId } : {}

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

