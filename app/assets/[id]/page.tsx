'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'

interface Asset {
  id: string
  description: string
  imageUrl?: string | null
  mimeType?: string | null
  type?: 'image' | 'svg' | 'html'
  provider?: string | null
  model?: string | null
  createdAt: string
  user?: {
    id: string
    nickname?: string
    avatar?: string
  }
}

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleBack = () => {
    // 直接使用浏览器历史记录返回上一页
    // 如果是从其他页面进入的，会返回到那个页面
    // 如果是直接访问的，会返回到浏览器历史记录的上一页
    router.back()
  }

  useEffect(() => {
    if (params.id) {
      fetchAsset(params.id as string)
    }
  }, [params.id])

  const fetchAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/assets/${id}`)
      if (response.ok) {
        const data = await response.json()
        setAsset(data.asset)
      }
    } catch (error) {
      console.error('获取素材详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!asset?.imageUrl) return

    try {
      await navigator.clipboard.writeText(asset.imageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  if (loading) {
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        <Navigation />
        <main className="flex-1 overflow-hidden p-2 sm:p-3 lg:p-6">
          <div className="h-full max-w-screen-2xl mx-auto">
            <div className="h-full bg-gray-50 rounded-xl shadow-sm border border-white/50 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-700">加载中...</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        <Navigation />
        <main className="flex-1 overflow-hidden p-2 sm:p-3 lg:p-6">
          <div className="h-full max-w-screen-2xl mx-auto">
            <div className="h-full bg-gray-50 rounded-xl shadow-sm border border-white/50 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-4">素材不存在</h1>
                  <Link href="/assets" className="text-blue-500 hover:text-blue-700">
                    返回素材列表
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navigation />
      <main className="flex-1 overflow-hidden p-2 sm:p-3 lg:p-6">
        <div className="h-full max-w-screen-2xl mx-auto">
          <div className="h-full bg-gray-50 rounded-xl shadow-sm border border-white/50 overflow-hidden flex flex-col min-h-0">
            {/* 顶部信息区 */}
            <header className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={handleBack}
                className="text-sm sm:text-base text-blue-500 hover:text-blue-700 mb-2 sm:mb-4 inline-block touch-manipulation"
              >
                ← 返回
              </button>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">
                  图片
                </span>
              </div>
            </header>

            {/* 内容滚动区 */}
            <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-gray-300 rounded-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 overflow-hidden">
                  <div className="w-full flex items-center justify-center overflow-auto" style={{ minHeight: '400px', maxHeight: '600px' }}>
                    {asset.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt={asset.description}
                        className="max-w-full max-h-[600px] w-auto h-auto rounded-lg border border-gray-200 shadow-sm object-contain bg-white"
                      />
                    ) : (
                      <div className="text-gray-500">图片地址缺失</div>
                    )}
                  </div>
                </div>

                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          复制链接
                        </>
                      )}
                    </button>
                    <div className="flex gap-2">
                      {asset.imageUrl && (
                        <>
                          <Link
                            href={`/?editImageUrl=${encodeURIComponent(asset.imageUrl)}`}
                            className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                          >
                            修改
                          </Link>
                          <Link
                            href={`/?composeAssetIds=${params.id}&tab=compose`}
                            className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                          >
                            合成
                          </Link>
                          <a
                            href={asset.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                          >
                            下载/打开
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  {asset.imageUrl && (
                    <details>
                      <summary className="cursor-pointer text-sm sm:text-base text-blue-500 hover:text-blue-700 mb-2 py-2 touch-manipulation">
                        查看图片链接
                      </summary>
                      <pre className="p-3 sm:p-4 bg-gray-100 rounded-lg overflow-auto text-xs sm:text-sm max-h-[200px]">
                        <code>{asset.imageUrl}</code>
                      </pre>
                    </details>
                  )}
                </div>

                <div className="text-xs sm:text-sm text-gray-600 space-y-1.5 sm:space-y-2">
                  <p>创建时间: {new Date(asset.createdAt).toLocaleString('zh-CN')}</p>
                  {asset.provider && (
                    <p>
                      AI 模型: <span className="font-medium">{asset.provider === 'gemini' ? 'Google Gemini' : asset.provider === 'openai' ? 'OpenAI' : asset.provider}</span>
                      {asset.model && <span className="ml-2 text-gray-500">({asset.model})</span>}
                    </p>
                  )}
                  {asset.user && (
                    <p>创建者: {asset.user.nickname || '匿名用户'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

