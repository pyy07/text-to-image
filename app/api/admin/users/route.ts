import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// TODO: 添加管理员权限验证
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        nickname: true,
        wechatOpenId: true,
        usageCount: true,
        maxUsage: true,
        isPermanent: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, isPermanent, resetUsage, increaseUsage } = body

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户 ID' },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (typeof isPermanent === 'boolean') {
      updateData.isPermanent = isPermanent
    }

    if (resetUsage) {
      updateData.usageCount = 0
    }

    if (increaseUsage && typeof increaseUsage === 'number') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })
      if (user) {
        updateData.maxUsage = {
          increment: increaseUsage,
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('更新用户错误:', error)
    return NextResponse.json(
      { error: '更新用户失败' },
      { status: 500 }
    )
  }
}

