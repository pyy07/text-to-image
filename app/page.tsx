'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ImageGenerator from '@/components/ImageGenerator'
import ImageComposer from '@/components/ImageComposer'
import ImagePreview from '@/components/ImagePreview'
import Navigation from '@/components/Navigation'
import TaskList from '@/components/TaskList'

interface User {
  id: string
  nickname?: string
  avatar?: string
  usageCount: number
  maxUsage: number
  isPermanent: boolean
  remaining: number
}

function HomeContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null) // 输出图片
  const [imageLoading, setImageLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [activeTab, setActiveTab] = useState<'generate' | 'compose'>('generate')
  // 输入图片状态
  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null) // 单张输入图片（修改模式）
  // 使用 useRef 保存 inputImageUrls，避免组件重新挂载时丢失
  const inputImageUrlsRef = useRef<string[]>([])
  const [inputImageUrls, setInputImageUrls] = useState<string[]>(() => {
    // 初始化时尝试从 ref 恢复（如果组件重新挂载）
    return inputImageUrlsRef.current.length > 0 ? inputImageUrlsRef.current : []
  }) // 多张输入图片（合成模式）
  const [previewMode, setPreviewMode] = useState<'generate' | 'edit' | 'compose'>('generate')
  
  // 同步 ref 和 state
  useEffect(() => {
    inputImageUrlsRef.current = inputImageUrls
  }, [inputImageUrls])

  // 初始化：检查认证和用户信息
  useEffect(() => {
    // 检查是否允许匿名访问
    fetch('/api/auth/check')
      .then((res) => res.json())
      .then((data) => {
        setAllowAnonymous(data.allowAnonymous || false)
      })
      .catch(() => {
        setAllowAnonymous(false)
      })

    // 检查 URL 中是否有 token（登录回调）
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    
    if (token) {
      // 保存 token 到 localStorage
      localStorage.setItem('auth_token', token)
      // 清除 URL 中的 token
      window.history.replaceState({}, '', window.location.pathname)
      // 获取用户信息
      try {
        const payload = JSON.parse(atob(token))
        fetchUserInfo(payload.userId)
      } catch (error) {
        setLoading(false)
      }
    } else {
      // 从 localStorage 获取 token
      const savedToken = localStorage.getItem('auth_token')
      if (savedToken) {
        try {
          const payload = JSON.parse(atob(savedToken))
          fetchUserInfo(payload.userId)
        } catch (error) {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
  }, [])

  // 监听 URL 参数变化，处理图片编辑和合成
  useEffect(() => {
    const editImageUrl = searchParams.get('editImageUrl')
    const editAssetId = searchParams.get('editAssetId')
    const composeAssetIds = searchParams.get('composeAssetIds')
    const tab = searchParams.get('tab')
    
    if (editImageUrl) {
      // 直接使用 URL 参数中的图片地址
      setImageUrl(decodeURIComponent(editImageUrl))
      // 清除 URL 参数
      window.history.replaceState({}, '', window.location.pathname)
    } else if (editAssetId) {
      // 通过 assetId 获取图片地址
      fetch(`/api/assets/${editAssetId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.asset?.imageUrl) {
            setImageUrl(data.asset.imageUrl)
          }
        })
        .catch((error) => {
          console.error('获取素材信息失败:', error)
        })
      // 清除 URL 参数
      window.history.replaceState({}, '', window.location.pathname)
    } else if (composeAssetIds) {
      // 切换到合成标签页
      setActiveTab('compose')
      // 通过 assetIds 获取图片地址
      const ids = composeAssetIds.split(',').filter(Boolean)
      Promise.all(
        ids.map((id) =>
          fetch(`/api/assets/${id}`)
            .then((res) => res.json())
            .then((data) => data.asset?.imageUrl)
            .catch(() => null)
        )
      ).then((urls) => {
        const validUrls = urls.filter((url): url is string => typeof url === 'string' && !!url)
        if (validUrls.length > 0) {
          // 追加新选择的图片，而不是替换（保留之前已选择的图片）
          // 使用 ref 中的值，确保即使组件重新挂载也能保留之前的图片
          setInputImageUrls((prev) => {
            // 如果 prev 为空，尝试从 ref 中恢复
            const current = prev.length > 0 ? prev : inputImageUrlsRef.current
            const combined = [...current]
            validUrls.forEach((url) => {
              if (!combined.includes(url)) {
                combined.push(url)
              }
            })
            return combined
          })
        }
      })
      // 清除 URL 参数
      window.history.replaceState({}, '', window.location.pathname)
    } else if (tab === 'compose') {
      // 如果只是切换标签页，保持已有的图片不变
      setActiveTab('compose')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  const fetchUserInfo = async (userId: string) => {
    try {
      const response = await fetch('/api/user', {
        headers: {
          'x-user-id': userId,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data)
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWechatLogin = () => {
    // 跳转到登录页面
    window.location.href = '/login'
  }

  const handleLogout = async () => {
    try {
      // 调用退出登录 API（可选，主要用于服务端清理）
      await fetch('/api/auth/logout', {
        method: 'POST',
      })
    } catch (error) {
      console.error('退出登录失败:', error)
    } finally {
      // 清除本地存储的 token
      localStorage.removeItem('auth_token')
      // 刷新页面
      window.location.href = '/'
    }
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/uploads/image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '上传失败')
      // API 返回的是 inputImageUrl 字段
      if (typeof data.inputImageUrl === 'string' && data.inputImageUrl) {
        // 上传后：在文生图模式下，有图即切换到修改模式
        if (activeTab === 'generate') {
          setInputImageUrl(data.inputImageUrl)
          setImageUrl(data.inputImageUrl)
          setPreviewMode('edit')
        }
      } else {
        throw new Error('上传成功但未返回图片地址')
      }
    } catch (error: any) {
      console.error('图片上传失败:', error)
      alert(error.message || '上传失败，请稍后重试')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleModeChange = (mode: 'generate' | 'edit', inputUrl?: string | null) => {
    setPreviewMode(mode)
    if (mode === 'generate') {
      setInputImageUrl(null)
      // 如果切换到生成模式，也清除输出图片
      if (!inputUrl) {
        setImageUrl(null)
      }
    } else {
      setInputImageUrl(inputUrl || null)
    }
  }

  const handleInputImagesChange = (urls: string[]) => {
    setInputImageUrls(urls)
    setPreviewMode('compose')
  }

  const handleTabChange = (tab: 'generate' | 'compose') => {
    setActiveTab(tab)
    if (tab === 'generate') {
      // 切换到文生图模式，清除合成相关的输入图片
      setInputImageUrls([])
      setPreviewMode('generate')
    } else {
      // 切换到合成模式，保持已有的图片不变
      setPreviewMode('compose')
      setInputImageUrl(null)
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

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navigation onLogout={handleLogout} />
      <main className="flex-1 overflow-hidden p-2 sm:p-3 lg:p-6">
        <div className="h-full max-w-screen-2xl mx-auto">
          <div className="h-full bg-gray-50 rounded-xl shadow-sm border border-white/50 overflow-hidden flex flex-col min-h-0">
            {/* 内容滚动区：移动端预览+操作在同一滚动容器里上下滑动 */}
            <div className="flex-1 overflow-y-auto min-h-0 home-scroll">
              <div className="flex flex-col lg:flex-row min-h-full">
                {/* 预览区域 - 移动端在上，桌面端在左 */}
                <div className="flex-1 bg-white p-3 sm:p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 order-1 min-h-0">
                  <div className="flex-1 bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm min-h-[320px] sm:min-h-[420px] lg:min-h-0 flex flex-col">
                    <ImagePreview 
                      imageUrl={imageUrl} 
                      inputImageUrl={inputImageUrl}
                      inputImageUrls={inputImageUrls.length > 0 ? inputImageUrls : undefined}
                      loading={imageLoading} 
                      mode={previewMode}
                      onImageUpload={activeTab === 'generate' ? handleImageUpload : undefined}
                      uploading={uploadingImage}
                    />
                  </div>
                </div>

                {/* 控制面板 - 移动端在下，桌面端在右 */}
                <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 order-2">
                  <div className="p-3 sm:p-6 h-full flex flex-col">
                    {/* 任务列表 */}
                    {user?.id && <TaskList userId={user.id} />}
                    
                    {/* 标签页切换 */}
                    <div className="mb-4 flex gap-2 border-b border-gray-200">
                      <button
                        onClick={() => handleTabChange('generate')}
                        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab === 'generate'
                            ? 'text-orange-600 border-b-2 border-orange-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        文生图
                      </button>
                      <button
                        onClick={() => handleTabChange('compose')}
                        className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                          activeTab === 'compose'
                            ? 'text-orange-600 border-b-2 border-orange-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        合成
                      </button>
                    </div>

                    {/* 根据标签页显示不同组件 */}
                    {activeTab === 'generate' ? (
                      <ImageGenerator
                        userId={user?.id}
                        remaining={user?.remaining ?? 0}
                        isLoggedIn={!!user}
                        allowAnonymous={allowAnonymous}
                        onLoginRequest={handleWechatLogin}
                        imageUrl={imageUrl}
                        onImageGenerated={(url) => {
                          setImageUrl(url || null)
                          setImageLoading(false)
                        }}
                        onLoadingChange={(loading) => setImageLoading(loading)}
                        onModeChange={handleModeChange}
                      />
                    ) : (
                      <ImageComposer
                        userId={user?.id}
                        remaining={user?.remaining ?? 0}
                        isLoggedIn={!!user}
                        allowAnonymous={allowAnonymous}
                        onLoginRequest={handleWechatLogin}
                        onImageGenerated={(url) => {
                          setImageUrl(url || null)
                          setImageLoading(false)
                        }}
                        onLoadingChange={(loading) => setImageLoading(loading)}
                        onInputImagesChange={handleInputImagesChange}
                        initialImageUrls={inputImageUrls}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <HomeContent />
    </Suspense>
  )
}
