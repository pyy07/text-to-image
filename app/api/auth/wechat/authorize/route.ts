import { NextRequest, NextResponse } from 'next/server'

// 微信登录授权发起（支持测试号和网站应用）
export async function GET(request: NextRequest) {
  const appId = process.env.WECHAT_APP_ID
  const redirectUri = process.env.WECHAT_REDIRECT_URI || 
    `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/wechat`
  const useTestAccount = process.env.WECHAT_USE_TEST_ACCOUNT === 'true'
  
  // 如果没有配置微信 AppID，使用开发模式
  if (!appId) {
    // 开发模式：直接返回一个模拟的登录页面
    return NextResponse.redirect(
      new URL('/api/auth/wechat?dev=true', request.url)
    )
  }

  // 检查请求来源，如果是 AJAX 请求，返回 JSON；否则直接跳转
  const acceptHeader = request.headers.get('accept') || ''
  const isJsonRequest = acceptHeader.includes('application/json')

  const state = Math.random().toString(36).substring(7) // 生成随机 state
  
  let wechatAuthUrl: string
  
  // 自动检测：如果 AppID 以 wx 开头，很可能是测试号或公众号
  // 测试号/公众号使用网页授权，网站应用使用扫码登录
  const isTestAccount = useTestAccount || appId.startsWith('wx')
  
  if (isTestAccount) {
    // 测试号/公众号模式：使用网页授权（需要在微信客户端内打开）
    // scope 使用 snsapi_userinfo（获取用户信息）或 snsapi_base（仅获取 openid）
    wechatAuthUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`
  } else {
    // 网站应用模式：使用扫码登录（PC端扫码）
    // scope 必须是 snsapi_login
    wechatAuthUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`
  }

  if (isJsonRequest) {
    // 返回 JSON，包含授权 URL
    return NextResponse.json({
      authUrl: wechatAuthUrl,
      redirectUri,
      state,
      isTestAccount: isTestAccount,
    })
  } else {
    // 如果是测试号，跳转到二维码页面；否则直接跳转
    if (isTestAccount) {
      const qrPageUrl = new URL('/login/qr', request.url)
      qrPageUrl.searchParams.set('authUrl', wechatAuthUrl)
      return NextResponse.redirect(qrPageUrl)
    } else {
      // 网站应用：直接跳转到微信扫码页面
      return NextResponse.redirect(wechatAuthUrl)
    }
  }
}

