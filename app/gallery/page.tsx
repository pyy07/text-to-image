'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import AnimationIframe from '@/components/AnimationIframe'

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

interface Comic {
  id: string
  articleUrl: string | null
  articleTitle?: string | null
  resultImageUrl: string | null
  createdAt: string
  promptText?: string
  user?: {
    id: string
    nickname?: string
    avatar?: string
  }
}

interface Animation {
  id: string
  userDescription: string
  format: string
  resultImageUrl: string | null
  createdAt: string
  user?: {
    id: string
    nickname?: string
    avatar?: string
  }
}

export default function GalleryPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [trialAssets, setTrialAssets] = useState<Asset[]>([])
  const [comics, setComics] = useState<Comic[]>([])
  const [animations, setAnimations] = useState<Animation[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'images' | 'trial' | 'comics' | 'animations'>('comics')
  const [allowDelete, setAllowDelete] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('') // 防抖后用于请求
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSearchQueryRef = useRef(searchQuery)
  const pageSize = 12

  const copyPrompt = async (text: string, id: string) => {
    if (!text?.trim()) return
    try {
      await navigator.clipboard.writeText(text.trim())
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    const trimmed = searchKeyword.trim()
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(trimmed)
      searchDebounceRef.current = null
    }, 400)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchKeyword])

  useEffect(() => {
    const searchJustChanged = prevSearchQueryRef.current !== searchQuery
    if (searchJustChanged) {
      prevSearchQueryRef.current = searchQuery
      setPage(1)
    }
    const pageToFetch = searchJustChanged ? 1 : page
    if (activeTab === 'images') {
      fetchAssets(pageToFetch)
    } else if (activeTab === 'trial') {
      fetchTrialAssets(pageToFetch)
    } else if (activeTab === 'animations') {
      fetchAnimations(pageToFetch)
    } else {
      fetchComics(pageToFetch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab, searchQuery])

  useEffect(() => {
    fetch('/api/features')
      .then((r) => r.ok && r.json())
      .then((data) => typeof data?.allowDelete === 'boolean' && setAllowDelete(data.allowDelete))
      .catch(() => {})
  }, [])

  const fetchAssets = async (pageOverride?: number) => {
    const p = pageOverride ?? page
    try {
      setLoading(true)
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const response = await fetch(`/api/assets?page=${p}&limit=${pageSize}&publicOnly=true&excludeTrial=true${q}`)

      if (response.ok) {
        const data = await response.json()
        if (p === 1) {
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

  const fetchTrialAssets = async (pageOverride?: number) => {
    const p = pageOverride ?? page
    try {
      setLoading(true)
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const response = await fetch(`/api/assets?page=${p}&limit=${pageSize}&trialOnly=true${q}`)

      if (response.ok) {
        const data = await response.json()
        if (p === 1) {
          setTrialAssets(data.assets || [])
        } else {
          setTrialAssets((prev) => [...prev, ...(data.assets || [])])
        }
        setHasMore((data.assets || []).length === pageSize)
      }
    } catch (error) {
      console.error('获取试用案例列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComics = async (pageOverride?: number) => {
    const p = pageOverride ?? page
    try {
      setLoading(true)
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const response = await fetch(`/api/comics?page=${p}&limit=${pageSize}${q}`)

      if (response.ok) {
        const data = await response.json()
        if (p === 1) {
          setComics(data.comics || [])
        } else {
          setComics((prev) => [...prev, ...(data.comics || [])])
        }
        setHasMore((data.comics || []).length === pageSize)
      }
    } catch (error) {
      console.error('获取漫画列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnimations = async (pageOverride?: number) => {
    const p = pageOverride ?? page
    try {
      setLoading(true)
      const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''
      const response = await fetch(`/api/animations?page=${p}&limit=${pageSize}${q}`)

      if (response.ok) {
        const data = await response.json()
        if (p === 1) {
          setAnimations(data.animations || [])
        } else {
          setAnimations((prev) => [...prev, ...(data.animations || [])])
        }
        setHasMore((data.animations || []).length === pageSize)
      }
    } catch (error) {
      console.error('获取动画案例列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1)
    }
  }

  const handleTabChange = (tab: 'images' | 'trial' | 'comics' | 'animations') => {
    setActiveTab(tab)
    setPage(1)
    setAssets([])
    setTrialAssets([])
    setComics([])
    setAnimations([])
    setHasMore(true)
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!allowDelete || deletingId) return
    if (!confirm('确定要删除这条图片案例吗？')) return
    setDeletingId(assetId)
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' })
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId))
        setTrialAssets((prev) => prev.filter((a) => a.id !== assetId))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || '删除失败')
      }
    } catch {
      alert('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteComic = async (comicId: string) => {
    if (!allowDelete || deletingId) return
    if (!confirm('确定要删除这条漫画案例吗？')) return
    setDeletingId(comicId)
    try {
      const res = await fetch(`/api/comic/${comicId}`, { method: 'DELETE' })
      if (res.ok) {
        setComics((prev) => prev.filter((c) => c.id !== comicId))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || '删除失败')
      }
    } catch {
      alert('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownloadAnimation = async (anim: Animation) => {
    if (!anim.resultImageUrl) return
    setDownloadingId(anim.id)
    try {
      const res = await fetch(anim.resultImageUrl, { cache: 'no-store' })
      const text = await res.text()
      const isH5 = anim.format === 'h5'
      const mime = isH5 ? 'text/html' : 'image/svg+xml'
      const ext = isH5 ? 'html' : 'svg'
      const blob = new Blob([text], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `animation-${anim.id}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('下载失败:', e)
      window.open(anim.resultImageUrl!, '_blank')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDeleteAnimation = async (animationId: string) => {
    if (!allowDelete || deletingId) return
    if (!confirm('确定要删除这条动画案例吗？')) return
    setDeletingId(animationId)
    try {
      const res = await fetch(`/api/animation/${animationId}`, { method: 'DELETE' })
      if (res.ok) {
        setAnimations((prev) => prev.filter((a) => a.id !== animationId))
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || '删除失败')
      }
    } catch {
      alert('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navigation />
      <main className="flex-1 overflow-hidden p-2 sm:p-3 lg:p-6">
        {/* 内容面板：移动端内部滚动，导航保持固定可见 */}
        <div className="h-full max-w-screen-2xl mx-auto">
          <div className="h-full bg-gray-50 rounded-xl shadow-sm border border-white/50 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-col min-h-0">
            {/* 标签页切换 + 搜索（同一行，搜索靠右） */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
              <div className="flex gap-2 flex-1 flex-wrap min-w-0">
                <button
                  onClick={() => handleTabChange('comics')}
                  className={`flex-1 min-w-[4rem] px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'comics'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  漫画案例
                </button>
                <button
                  onClick={() => handleTabChange('animations')}
                  className={`flex-1 min-w-[4rem] px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'animations'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  动画案例
                </button>
                <button
                  onClick={() => handleTabChange('images')}
                  className={`flex-1 min-w-[4rem] px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'images'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  图片案例
                </button>
                <button
                  onClick={() => handleTabChange('trial')}
                  className={`flex-1 min-w-[4rem] px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'trial'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  试用案例
                </button>
              </div>
              <input
                type="search"
                placeholder="搜索案例..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setSearchQuery(searchKeyword.trim())
                  }
                }}
                className="w-full sm:w-44 lg:w-56 flex-shrink-0 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-gray-400"
                aria-label="搜索案例"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading && (activeTab === 'images' ? assets.length === 0 : activeTab === 'trial' ? trialAssets.length === 0 : activeTab === 'animations' ? animations.length === 0 : comics.length === 0) ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">加载中...</p>
                  </div>
                </div>
              ) : activeTab === 'images' && assets.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4">🎨</div>
                    <p className="text-gray-600 text-lg">暂无图片案例</p>
                    <Link
                      href="/"
                      className="mt-4 inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      去生成第一张图片
                    </Link>
                  </div>
                </div>
              ) : activeTab === 'comics' && comics.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4">📚</div>
                    <p className="text-gray-600 text-lg">暂无漫画案例</p>
                    <Link
                      href="/?tab=comic"
                      className="mt-4 inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      去生成第一篇漫画
                    </Link>
                  </div>
                </div>
              ) : activeTab === 'animations' && animations.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4">🎬</div>
                    <p className="text-gray-600 text-lg">暂无动画案例</p>
                    <Link
                      href="/?tab=animation"
                      className="mt-4 inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      去生成第一个动画
                    </Link>
                  </div>
                </div>
              ) : activeTab === 'trial' && trialAssets.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4">🧪</div>
                    <p className="text-gray-600 text-lg">暂无试用案例</p>
                    <Link
                      href="/trial"
                      className="mt-4 inline-block px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      去模型试用
                    </Link>
                  </div>
                </div>
              ) : searchQuery && !loading && ((activeTab === 'images' && assets.length === 0) || (activeTab === 'trial' && trialAssets.length === 0) || (activeTab === 'comics' && comics.length === 0) || (activeTab === 'animations' && animations.length === 0)) ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center py-10">
                    <p className="text-gray-600 text-lg">没有找到匹配「{searchQuery}」的案例</p>
                    <p className="text-sm text-gray-500 mt-2">试试其他关键词或清空搜索</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* 图片案例 */}
                  {activeTab === 'images' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col"
                        >
                          <Link href={`/assets/${asset.id}`} className="block flex-1 flex flex-col">
                            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-3 overflow-hidden relative">
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
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyPrompt(asset.description, asset.id)
                                }}
                                className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                              >
                                {copiedId === asset.id ? '已复制提示词' : '复制提示词'}
                              </button>
                              {asset.imageUrl && (
                                <>
                                  <Link
                                    href={`/?editImageUrl=${encodeURIComponent(asset.imageUrl)}`}
                                    className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    修改
                                  </Link>
                                  <Link
                                    href={`/?composeAssetIds=${asset.id}&tab=compose`}
                                    className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    合成
                                  </Link>
                                </>
                              )}
                              {allowDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleDeleteAsset(asset.id)
                                  }}
                                  disabled={deletingId === asset.id}
                                  className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                  {deletingId === asset.id ? '删除中...' : '删除'}
                                </button>
                              )}
                            </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 试用案例 */}
                  {activeTab === 'trial' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {trialAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col"
                        >
                          <Link href={`/assets/${asset.id}`} className="block flex-1 flex flex-col">
                            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-3 overflow-hidden relative">
                              <span className="absolute left-0 top-0 z-10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white rounded-br-lg shadow-md bg-amber-600">
                                试用
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
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyPrompt(asset.description, asset.id)
                                }}
                                className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                              >
                                {copiedId === asset.id ? '已复制提示词' : '复制提示词'}
                              </button>
                              {asset.imageUrl && (
                                <>
                                  <Link
                                    href={`/?editImageUrl=${encodeURIComponent(asset.imageUrl)}`}
                                    className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    修改
                                  </Link>
                                  <Link
                                    href={`/?composeAssetIds=${asset.id}&tab=compose`}
                                    className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                    }}
                                  >
                                    合成
                                  </Link>
                                </>
                              )}
                              {allowDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleDeleteAsset(asset.id)
                                  }}
                                  disabled={deletingId === asset.id}
                                  className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                  {deletingId === asset.id ? '删除中...' : '删除'}
                                </button>
                              )}
                            </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 动画案例 */}
                  {activeTab === 'animations' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {animations.map((anim) => (
                        <div
                          key={anim.id}
                          className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col"
                        >
                          <a
                            href={anim.resultImageUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block flex-1 min-h-0 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded-lg"
                          >
                            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-3 overflow-hidden relative">
                              <span className="absolute left-0 top-0 z-10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white rounded-br-lg shadow-md bg-teal-600">
                                {anim.format === 'h5' ? 'H5' : 'SVG'}
                              </span>
                              <div className="w-full h-full rounded-md overflow-hidden bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                {anim.resultImageUrl ? (
                                  <AnimationIframe
                                    url={anim.resultImageUrl}
                                    title={anim.userDescription}
                                    className="w-full h-full border-0 pointer-events-none"
                                  />
                                ) : (
                                  <div className="text-gray-500 text-sm">无预览</div>
                                )}
                              </div>
                            </div>
                            <div className="p-3 sm:p-4 flex-1 flex flex-col">
                              <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-2 group-hover:text-teal-600 transition-colors flex-shrink-0">
                                {anim.userDescription || '文生动'}
                              </p>
                              <div className="text-xs text-gray-500 space-y-1 mt-auto">
                                <div className="flex items-center justify-between">
                                  <span>
                                    {new Date(anim.createdAt).toLocaleDateString('zh-CN')}
                                  </span>
                                  {anim.user?.nickname && (
                                    <span className="text-gray-400">
                                      @{anim.user.nickname}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </a>
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex-shrink-0 space-y-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyPrompt(anim.userDescription, anim.id)
                                }}
                                className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                              >
                                {copiedId === anim.id ? '已复制提示词' : '复制提示词'}
                              </button>
                              {anim.resultImageUrl && (
                                <div className="flex gap-2">
                                  <a
                                    href={anim.resultImageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-3 py-2 text-xs sm:text-sm text-center bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors"
                                  >
                                    打开动画
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      handleDownloadAnimation(anim)
                                    }}
                                    disabled={downloadingId === anim.id}
                                    className="flex-1 px-3 py-2 text-xs sm:text-sm text-center bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                                    title="下载动画文件"
                                  >
                                    {downloadingId === anim.id ? '下载中...' : '下载'}
                                  </button>
                                </div>
                              )}
                              {allowDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleDeleteAnimation(anim.id)
                                  }}
                                  disabled={deletingId === anim.id}
                                  className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                  {deletingId === anim.id ? '删除中...' : '删除'}
                                </button>
                              )}
                            </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 漫画案例 */}
                  {activeTab === 'comics' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {comics.map((comic) => (
                        <div
                          key={comic.id}
                          className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 flex flex-col"
                        >
                          {comic.articleUrl ? (
                            <a
                              href={comic.articleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block flex-1 min-h-0 flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded-lg"
                            >
                              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-3 overflow-hidden relative">
                                <span className="absolute left-0 top-0 z-10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white rounded-br-lg shadow-md bg-purple-600">
                                  漫画
                                </span>
                                <div className="w-full h-full rounded-md overflow-hidden bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                  {comic.resultImageUrl ? (
                                    <img
                                      src={comic.resultImageUrl}
                                      alt={comic.articleTitle || '分镜漫画'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-gray-500 text-sm">无预览</div>
                                  )}
                                </div>
                              </div>
                              <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-2 group-hover:text-purple-600 transition-colors flex-shrink-0 font-medium">
                                  {comic.articleTitle || '无标题'}
                                </p>
                                <div className="text-xs text-gray-500 space-y-1 mt-auto">
                                  <div className="flex items-center justify-between">
                                    <span>
                                      {new Date(comic.createdAt).toLocaleDateString('zh-CN')}
                                    </span>
                                    {comic.user?.nickname && (
                                      <span className="text-gray-400">
                                        @{comic.user.nickname}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </a>
                          ) : (
                            <>
                              <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-3 overflow-hidden relative">
                                <span className="absolute left-0 top-0 z-10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white rounded-br-lg shadow-md bg-purple-600">
                                  漫画
                                </span>
                                <div className="w-full h-full rounded-md overflow-hidden bg-white/80 backdrop-blur-sm flex items-center justify-center">
                                  {comic.resultImageUrl ? (
                                    <img
                                      src={comic.resultImageUrl}
                                      alt={comic.articleTitle || '分镜漫画'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="text-gray-500 text-sm">无预览</div>
                                  )}
                                </div>
                              </div>
                              <div className="p-3 sm:p-4 flex-1 flex flex-col">
                                <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-2 flex-shrink-0 font-medium">
                                  {comic.articleTitle || '无标题'}
                                </p>
                                <div className="text-xs text-gray-500 space-y-1 mt-auto">
                                  <div className="flex items-center justify-between">
                                    <span>
                                      {new Date(comic.createdAt).toLocaleDateString('zh-CN')}
                                    </span>
                                    {comic.user?.nickname && (
                                      <span className="text-gray-400">
                                        @{comic.user.nickname}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          <div className="px-3 sm:px-4 pb-3 sm:pb-4 flex-shrink-0 space-y-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  copyPrompt(comic.promptText ?? comic.articleTitle ?? '', comic.id)
                                }}
                                className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-300"
                              >
                                {copiedId === comic.id ? '已复制提示词' : '复制提示词'}
                              </button>
                              {comic.resultImageUrl && (
                                <a
                                  href={comic.resultImageUrl}
                                  download={`comic-${comic.id}.png`}
                                  className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                                >
                                  下载漫画
                                </a>
                              )}
                              {allowDelete && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleDeleteComic(comic.id)
                                  }}
                                  disabled={deletingId === comic.id}
                                  className="block w-full px-3 py-2 text-xs sm:text-sm text-center bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                  {deletingId === comic.id ? '删除中...' : '删除'}
                                </button>
                              )}
                            </div>
                        </div>
                      ))}
                    </div>
                  )}

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

