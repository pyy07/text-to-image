import { NextResponse } from 'next/server'

// 检查是否允许匿名访问（用于本地测试）
export async function GET() {
  // 通过环境变量控制是否允许匿名访问
  // 方式1: 显式设置 ALLOW_ANONYMOUS=true
  // 方式2: 在开发环境（NODE_ENV=development）下默认允许
  const allowAnonymous = 
    process.env.ALLOW_ANONYMOUS === 'true' || 
    (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')
  
  return NextResponse.json({
    allowAnonymous,
    requireAuth: !allowAnonymous,
  })
}

