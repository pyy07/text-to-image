import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername, verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: '用户名不能为空' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: '密码不能为空' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await getUserByUsername(username.trim())
    if (!user) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码
    if (!user.password) {
      return NextResponse.json(
        { error: '该账户未设置密码，请使用其他方式登录' },
        { status: 401 }
      )
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
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
    console.error('登录错误:', error)
    return NextResponse.json(
      { error: error.message || '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}

