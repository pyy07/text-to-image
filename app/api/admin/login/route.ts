import { NextRequest, NextResponse } from 'next/server'

/**
 * 后台登录：仅校验环境变量 ADMIN_USERNAME / ADMIN_PASSWORD。
 * 配置后直接用该账号密码在 /admin/login 登录即可。
 */
export async function POST(request: NextRequest) {
  const adminUsername = process.env.ADMIN_USERNAME?.trim()
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminUsername || adminPassword === undefined || adminPassword === '') {
    return NextResponse.json(
      { error: '未配置管理员账号或密码（ADMIN_USERNAME / ADMIN_PASSWORD）' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (username !== adminUsername || password !== adminPassword) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    const token = Buffer.from(
      JSON.stringify({ admin: true, username: adminUsername })
    ).toString('base64')

    return NextResponse.json({
      success: true,
      token,
      user: { username: adminUsername, nickname: adminUsername },
    })
  } catch {
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
