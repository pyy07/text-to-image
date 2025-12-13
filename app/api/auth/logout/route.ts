import { NextResponse } from 'next/server'

// 退出登录
export async function POST() {
  // 服务端可以在这里清除 session 或 token
  // 由于我们使用的是 localStorage，主要在前端清除
  return NextResponse.json({
    success: true,
    message: '已退出登录',
  })
}

