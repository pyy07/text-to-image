import { NextResponse } from 'next/server'

// 检查微信配置状态
export async function GET() {
  const appId = process.env.WECHAT_APP_ID
  return NextResponse.json({
    configured: !!appId,
  })
}

