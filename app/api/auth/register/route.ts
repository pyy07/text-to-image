import { NextRequest, NextResponse } from 'next/server'
import { createUser, getUserByUsername } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, nickname } = body

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: '用户名不能为空' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为6位' },
        { status: 400 }
      )
    }

    // 检查用户名是否已存在
    try {
      const existingUser = await getUserByUsername(username.trim())
      if (existingUser) {
        return NextResponse.json(
          { error: '用户名已存在' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      // 如果数据库连接失败，继续尝试创建（可能是迁移未应用）
      if (error.code !== 'P1001' && !error.message?.includes('Can\'t reach database server')) {
        throw error
      }
    }

    // 创建用户（使用原生 SQL，因为迁移可能还未应用）
    const hashedPassword = await bcrypt.hash(password, 10)
    
    let user
    try {
      // 尝试使用 Prisma 创建（如果迁移已应用）
      user = await createUser(
        undefined, // wechatOpenId
        nickname || username.trim(), // nickname
        username.trim(), // username
        password // password
      )
    } catch (error: any) {
      // 如果迁移未应用或数据库连接失败，使用原生 SQL
      if (error.message?.includes('Unknown argument') || 
          error.message?.includes('username') ||
          error.code === 'P1001' ||
          error.message?.includes('Can\'t reach database server')) {
        try {
          const result = await prisma.$executeRaw`
            INSERT INTO users (id, username, password, nickname, "usageCount", "maxUsage", "isPermanent", "createdAt", "updatedAt")
            VALUES (gen_random_uuid()::text, ${username.trim()}, ${hashedPassword}, ${nickname || username.trim()}, 0, 3, false, NOW(), NOW())
            RETURNING id, username, nickname, "usageCount", "maxUsage", "isPermanent"
          `
          // 重新查询用户
          const users = await prisma.$queryRaw<Array<{ id: string; username: string | null; nickname: string | null }>>`
            SELECT id, username, nickname FROM users WHERE username = ${username.trim()} LIMIT 1
          `
          if (users.length > 0) {
            user = {
              id: users[0].id,
              username: users[0].username,
              nickname: users[0].nickname,
            } as any
          } else {
            throw new Error('创建用户失败')
          }
        } catch (sqlError: any) {
          // 如果原生 SQL 也失败，返回友好的错误信息
          if (sqlError.code === 'P1001' || sqlError.message?.includes('Can\'t reach database server')) {
            return NextResponse.json(
              { error: '数据库连接失败，请检查数据库配置或稍后重试' },
              { status: 503 }
            )
          }
          throw sqlError
        }
      } else {
        throw error
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: '注册失败' },
        { status: 500 }
      )
    }

    // 生成 token
    const token = Buffer.from(
      JSON.stringify({ userId: user.id })
    ).toString('base64')

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
      },
    })
  } catch (error: any) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: error.message || '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}

