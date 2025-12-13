import { NextRequest, NextResponse } from 'next/server'

// 处理微信登录错误
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // 重定向到登录页面并显示错误信息
  const loginUrl = new URL('/login', request.url)
  if (error) {
    loginUrl.searchParams.set('error', error)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
  }

  return NextResponse.redirect(loginUrl)
}

