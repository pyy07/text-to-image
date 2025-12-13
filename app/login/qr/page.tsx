'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'

function QRLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrError, setQrError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    // 从 URL 参数获取授权 URL，或从 API 获取
    const authUrl = searchParams.get('authUrl')
    
    if (authUrl) {
      setQrUrl(decodeURIComponent(authUrl))
      setLoading(false)
    } else {
      // 如果没有 URL 参数，从 API 获取
      fetch('/api/auth/wechat/authorize', {
        headers: {
          'Accept': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.authUrl) {
            setQrUrl(data.authUrl)
          } else {
            setQrError('无法获取授权链接')
          }
        })
        .catch((error) => {
          console.error('获取授权 URL 失败:', error)
          setQrError('获取授权链接失败')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [searchParams])

  // 生成二维码
  useEffect(() => {
    if (!qrUrl || !canvasRef.current) return

    QRCode.toCanvas(
      canvasRef.current,
      qrUrl,
      {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (error) => {
        if (error) {
          console.error('生成二维码失败:', error)
          setQrError('生成二维码失败，请刷新重试')
        } else {
          setQrError(null)
        }
      }
    )
  }, [qrUrl])

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">微信登录</h1>
          <p className="text-sm sm:text-base text-gray-600">请使用微信扫码登录</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        ) : qrUrl ? (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-2 sm:p-4 bg-white border-2 border-gray-200 rounded-lg">
                {qrError ? (
                  <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
                    <div className="text-center px-2">
                      <p className="text-xs sm:text-sm text-red-600 mb-2">{qrError}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-500 text-white rounded text-xs sm:text-sm hover:bg-blue-600 touch-manipulation"
                      >
                        刷新重试
                      </button>
                    </div>
                  </div>
                ) : (
                  <canvas ref={canvasRef} className="max-w-full h-auto"></canvas>
                )}
              </div>
            </div>
            
            {!qrError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-blue-800 text-center">
                  📱 使用微信扫描上方二维码<br />
                  在微信中完成授权登录
                </p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => router.push('/login')}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 touch-manipulation py-2"
              >
                返回登录页面
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-gray-600 mb-4">获取授权链接失败</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base touch-manipulation"
            >
              返回登录页面
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function QRLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">加载中...</p>
            </div>
          </div>
        </main>
      }
    >
      <QRLoginContent />
    </Suspense>
  )
}

