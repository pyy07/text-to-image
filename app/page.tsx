'use client'

import { useEffect, useState } from 'react'
import ImageGenerator from '@/components/ImageGenerator'
import ImagePreview from '@/components/ImagePreview'
import Navigation from '@/components/Navigation'

interface User {
  id: string
  nickname?: string
  avatar?: string
  usageCount: number
  maxUsage: number
  isPermanent: boolean
  remaining: number
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

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

    // 检查 URL 参数中是否有 editImageUrl 或 editAssetId
    const editImageUrl = urlParams.get('editImageUrl')
    const editAssetId = urlParams.get('editAssetId')
    
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
    }
  }, [])

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
        // 上传后直接放到预览里：此时"有图即修改"
        setImageUrl(data.inputImageUrl)
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
      <Navigation user={user || undefined} onLogout={handleLogout} />
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
                      loading={imageLoading} 
                      onImageUpload={handleImageUpload}
                      uploading={uploadingImage}
                    />
                  </div>
                </div>

                {/* 控制面板 - 移动端在下，桌面端在右 */}
                <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 order-2">
                  <div className="p-3 sm:p-6 h-full flex flex-col">
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
                    />
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
