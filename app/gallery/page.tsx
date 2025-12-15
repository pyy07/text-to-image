'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

interface Asset {
  id: string
  description: string
  imageUrl?: string | null
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

export default function GalleryPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 12

  useEffect(() => {
    fetchAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const fetchAssets = async () => {
    try {
      setLoading(true)
      // 案例页面：只显示公开的（无userId）图片
      const response = await fetch(`/api/assets?page=${page}&limit=${pageSize}&publicOnly=true`)

      if (response.ok) {
        const data = await response.json()
        if (page === 1) {
          setAssets(data.assets || [])
        } else {
          setAssets((prev) => [...prev, ...(data.assets || [])])
        }
        setHasMore((data.assets || []).length === pageSize)
      }
    } catch (error) {
      console.error('获取案例列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navigation />
      <main className="flex-1 overflow-hidden p-2 sm:p-3 lg:p-6">
        {/* 内容面板：移动端内部滚动，导航保持固定可见 */}
        <div className="h-full max-w-screen-2xl mx-auto">
          <div className="h-full bg-gray-50 rounded-xl shadow-sm border border-white/50 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading && assets.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">加载中...</p>
                  </div>
                </div>
              ) : assets.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-10">
                <div className="text-6xl mb-4">🎨</div>
                <p className="text-gray-600 text-lg">暂无案例</p>
                <Link
                  href="/"
                  className="mt-4 inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  去生成第一张图片
                </Link>
              </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col"
                      >
                        <Link href={`/assets/${asset.id}`} className="block flex-1 flex flex-col">
                          <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-3 overflow-hidden relative">
                            {/* 类型角标（更醒目，不影响布局） */}
                            <span
                              className={`absolute left-0 top-0 z-10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white rounded-br-lg shadow-md ${
                                asset.type === 'image' || !asset.type ? 'bg-green-600' : 'bg-gray-600'
                              }`}
                            >
                              {asset.type === 'svg' ? 'SVG' : asset.type === 'html' ? 'H5' : 'IMG'}
                            </span>
                            <div className="w-full h-full rounded-md overflow-hidden bg-white/80 backdrop-blur-sm flex items-center justify-center">
                              {asset.imageUrl ? (
                                <img
                                  src={asset.imageUrl}
                                  alt={asset.description}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-gray-500 text-sm">无预览</div>
                              )}
                            </div>
                          </div>
                          <div className="p-3 sm:p-4 flex-1 flex flex-col">
                            <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors flex-shrink-0">
                              {asset.description}
                            </p>
                            <div className="text-xs text-gray-500 space-y-1 mt-auto">
                              {asset.provider && (
                                <p>
                                  {asset.provider === 'gemini' ? 'Gemini' : asset.provider === 'openai' ? 'OpenAI' : asset.provider}
                                  {asset.model && ` · ${asset.model}`}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <span>
                                  {new Date(asset.createdAt).toLocaleDateString('zh-CN')}
                                </span>
                                {asset.user?.nickname && (
                                  <span className="text-gray-400">
                                    @{asset.user.nickname}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                        {asset.imageUrl && (
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 flex-shrink-0">
                            <Link
                              href={`/?editImageUrl=${encodeURIComponent(asset.imageUrl)}`}
                              className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                              onClick={(e) => {
                                // 阻止事件冒泡，避免触发父 Link
                                e.stopPropagation()
                              }}
                            >
                              修改
                            </Link>
                            <Link
                              href={`/?composeAssetIds=${asset.id}&tab=compose`}
                              className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                              onClick={(e) => {
                                // 阻止事件冒泡，避免触发父 Link
                                e.stopPropagation()
                              }}
                            >
                              合成
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <div className="mt-8 sm:mt-12 text-center">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="px-6 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm touch-manipulation"
                      >
                        {loading ? '加载中...' : '加载更多'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

