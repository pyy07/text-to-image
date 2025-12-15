'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hasWechatConfig, setHasWechatConfig] = useState<boolean | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 通过 API 检查是否配置了微信
    fetch('/api/auth/wechat/check')
      .then((res) => res.json())
      .then(async (data) => {
        setHasWechatConfig(data.configured)
        // 如果已配置，获取授权 URL
        if (data.configured) {
          try {
            const authRes = await fetch('/api/auth/wechat/authorize', {
              headers: {
                'Accept': 'application/json',
              },
            })
            const authData = await authRes.json()
            if (authData.authUrl) {
              setQrUrl(authData.authUrl)
            }
          } catch (error) {
            console.error('获取授权 URL 失败:', error)
          }
        }
      })
      .catch(() => {
        setHasWechatConfig(false)
      })
  }, [])

  const handleWechatLogin = async () => {
    setLoading(true)
    try {
      // 获取授权 URL
      const response = await fetch('/api/auth/wechat/authorize', {
        headers: {
          'Accept': 'application/json',
        },
      })
      const data = await response.json()
      
      if (data.authUrl) {
        // 检查是否是测试号（需要在微信中打开）
        if (data.isTestAccount || data.authUrl.includes('oauth2/authorize')) {
          // 测试号：跳转到二维码页面
          window.location.href = `/login/qr?authUrl=${encodeURIComponent(data.authUrl)}`
        } else {
          // 网站应用：直接跳转到微信扫码页面
          window.location.href = data.authUrl
        }
      } else {
        // 如果没有返回 URL，直接跳转
        window.location.href = '/api/auth/wechat/authorize'
      }
    } catch (error) {
      console.error('获取授权 URL 失败:', error)
      // 失败时直接跳转
      window.location.href = '/api/auth/wechat/authorize'
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          nickname: nickname || username,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        setLoading(false)
        return
      }

      // 保存 token 并跳转
      if (data.token) {
        localStorage.setItem('auth_token', data.token)
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message || '注册失败，请稍后重试')
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '登录失败')
        setLoading(false)
        return
      }

      // 保存 token 并跳转
      if (data.token) {
        localStorage.setItem('auth_token', data.token)
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message || '登录失败，请稍后重试')
      setLoading(false)
    }
  }

  // 检查是否已经登录
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      router.push('/')
    }

    // 检查 URL 中的错误信息
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    const errorDescription = urlParams.get('error_description')
    
    if (error) {
      let errorMessage = errorDescription || error
      
      // 针对特定错误提供更友好的提示
      if (error === 'missing_code') {
        errorMessage = '缺少授权码，可能的原因：\n1. 测试号需要在微信客户端内打开链接\n2. 网页授权域名未正确配置\n3. 用户取消了授权\n\n请重新尝试登录'
      } else if (error === 'access_denied') {
        errorMessage = '用户取消了授权，请重新尝试登录'
      }
      
      alert(`登录错误: ${errorMessage}\n\n提示：如果使用测试号，请确保在微信客户端内打开链接进行授权。`)
      // 清除 URL 中的错误参数
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">文生图生成器</h1>
          {hasWechatConfig && (
            <p className="text-sm sm:text-base text-gray-600">请使用微信扫码登录</p>
          )}
        </div>

        {hasWechatConfig === null ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">检查配置中...</p>
          </div>
        ) : hasWechatConfig ? (
          <div className="space-y-4">
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-block p-3 sm:p-4 bg-gray-100 rounded-lg">
                <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center bg-white rounded">
                  <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">📱</div>
                    <p className="text-xs sm:text-sm text-gray-600 px-2">
                      点击下方按钮<br />
                      跳转到微信扫码页面
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-500">
                使用微信登录
              </p>
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                <p className="text-xs text-blue-800">
                  💡 提示：如果使用测试号，请在微信客户端内打开链接进行授权
                </p>
              </div>
            </div>

            <button
              onClick={handleWechatLogin}
              disabled={loading}
              className="w-full px-6 py-3 sm:py-3.5 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base touch-manipulation"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>跳转中...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" />
                  </svg>
                  <span>微信扫码登录</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4 border-b">
              <button
                onClick={() => {
                  setIsRegister(false)
                  setError(null)
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  !isRegister
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => {
                  setIsRegister(true)
                  setError(null)
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  isRegister
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                注册
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入用户名"
                />
              </div>

              {isRegister && (
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">
                    昵称（可选）
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入昵称"
                  />
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isRegister ? 6 : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isRegister ? '至少6位密码' : '请输入密码'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (isRegister ? '注册中...' : '登录中...') : (isRegister ? '注册' : '登录')}
              </button>
            </form>
          </div>
        )}

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            返回首页
          </a>
        </div>
      </div>
    </main>
  )
}

