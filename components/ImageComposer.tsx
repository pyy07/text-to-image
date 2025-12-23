'use client'

import { useEffect, useState, useRef } from 'react'
import { useTaskPolling } from '@/lib/hooks/useTaskPolling'

interface ImageComposerProps {
  userId?: string
  remaining: number
  isLoggedIn: boolean
  allowAnonymous?: boolean
  onLoginRequest: () => void
  onImageGenerated?: (imageUrl: string) => void
  onLoadingChange?: (loading: boolean) => void
  onInputImagesChange?: (imageUrls: string[]) => void
  initialImageUrls?: string[] // 初始选中的图片 URL
}

interface Provider {
  name: string
  configured: boolean
  models: string[]
}

interface Asset {
  id: string
  imageUrl: string
  description?: string
}

const SIZES = ['1024x1024', '768x768', '512x512']

export default function ImageComposer({
  userId,
  remaining,
  isLoggedIn,
  allowAnonymous = false,
  onLoginRequest,
  onImageGenerated,
  onLoadingChange,
  onInputImagesChange,
  initialImageUrls = [],
}: ImageComposerProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRemaining, setCurrentRemaining] = useState(remaining)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [size, setSize] = useState<string>(SIZES[0])
  // 使用 useRef 保存 selectedImages，避免组件重新挂载时丢失
  const selectedImagesRef = useRef<string[]>(initialImageUrls)
  const [selectedImages, setSelectedImages] = useState<string[]>(initialImageUrls) // 图片 URL 数组
  const [uploadingImages, setUploadingImages] = useState<string[]>([]) // 正在上传的图片 URL
  
  // 同步 ref 和 state
  useEffect(() => {
    selectedImagesRef.current = selectedImages
  }, [selectedImages])
  const [showAssetPicker, setShowAssetPicker] = useState(false)
  const [showGalleryPicker, setShowGalleryPicker] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [galleryAssets, setGalleryAssets] = useState<Asset[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [loadingGalleryAssets, setLoadingGalleryAssets] = useState(false)
  const [galleryPage, setGalleryPage] = useState(1)
  const [hasMoreGallery, setHasMoreGallery] = useState(true)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 轮询任务状态
  const { task: pollingTask, isPolling } = useTaskPolling({
    taskId: currentTaskId,
    userId,
    onCompleted: (task) => {
      if (task.resultImageUrl) {
        onImageGenerated?.(task.resultImageUrl)
        // 保留已选择的图片，不清空
      }
      setCurrentTaskId(null)
      setLoading(false)
      onLoadingChange?.(false)
    },
    onFailed: (task) => {
      setError(task.error || '任务失败')
      setCurrentTaskId(null)
      setLoading(false)
      onLoadingChange?.(false)
    },
  })

  useEffect(() => {
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => {
        const supported = (data.providers || []).filter((p: Provider) => p.name === 'openai')
        if (supported.length > 0) {
          setProviders(supported)
          const defaultProvider = (data.defaultProvider === 'openai' ? 'openai' : supported[0].name)
          setSelectedProvider(defaultProvider)
          const provider = supported.find((p: Provider) => p.name === defaultProvider) || supported[0]
          if (provider.models.length > 0) setSelectedModel(provider.models[0])
        }
      })
      .catch((e) => {
        console.error('获取 Provider 列表失败:', e)
      })
  }, [])

  useEffect(() => {
    const provider = providers.find((p) => p.name === selectedProvider)
    if (provider && provider.models.length > 0) {
      setSelectedModel(provider.models[0])
    }
  }, [selectedProvider, providers])

  useEffect(() => {
    setCurrentRemaining(remaining)
  }, [remaining])

  // 当初始图片 URL 变化时，确保 selectedImages 包含所有 initialImageUrls 中的图片
  useEffect(() => {
    // 如果 initialImageUrls 为空，不更新 selectedImages（保留用户已选择的图片）
    if (initialImageUrls.length === 0) {
      return
    }
    
    setSelectedImages((prev) => {
      // 如果 prev 为空，尝试从 ref 中恢复（处理组件重新挂载的情况）
      const current = prev.length > 0 ? prev : selectedImagesRef.current
      // 合并策略：保留 current 中的所有图片，同时确保包含 initialImageUrls 中的所有图片
      const combined = [...current]
      initialImageUrls.forEach((url) => {
        if (!combined.includes(url)) {
          combined.push(url)
        }
      })
      // 只有当合并后的结果与当前不同时才更新
      const currentSorted = [...current].sort()
      const combinedSorted = [...combined].sort()
      if (JSON.stringify(currentSorted) !== JSON.stringify(combinedSorted)) {
        return combined
      }
      return prev
    })
  }, [initialImageUrls]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const filesArray = Array.from(files)
    const newUploadingUrls: string[] = []

    for (const file of filesArray) {
      const tempUrl = URL.createObjectURL(file)
      newUploadingUrls.push(tempUrl)
      setUploadingImages((prev) => [...prev, tempUrl])

      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/uploads/image', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '上传失败')

        if (typeof data.inputImageUrl === 'string' && data.inputImageUrl) {
          setSelectedImages((prev) => {
            const newImages = [...prev, data.inputImageUrl]
            onInputImagesChange?.(newImages)
            return newImages
          })
        } else {
          throw new Error('上传成功但未返回图片地址')
        }
      } catch (error: any) {
        console.error('图片上传失败:', error)
        alert(`上传失败: ${error.message || '请稍后重试'}`)
      } finally {
        setUploadingImages((prev) => prev.filter((url) => url !== tempUrl))
        URL.revokeObjectURL(tempUrl)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index)
      onInputImagesChange?.(newImages)
      return newImages
    })
  }

  // 当选择的图片变化时，通知父组件
  useEffect(() => {
    onInputImagesChange?.(selectedImages)
  }, [selectedImages, onInputImagesChange])

  const loadAssets = async () => {
    if (!userId) return
    setLoadingAssets(true)
    try {
      const res = await fetch('/api/assets?userOnly=true&limit=50', {
        headers: {
          'x-user-id': userId,
        },
      })
      const data = await res.json()
      if (res.ok && data.assets) {
        setAssets(data.assets.filter((a: Asset) => a.imageUrl))
      }
    } catch (error) {
      console.error('加载素材失败:', error)
    } finally {
      setLoadingAssets(false)
    }
  }

  const handleSelectAsset = (asset: Asset) => {
    if (!selectedImages.includes(asset.imageUrl)) {
      setSelectedImages((prev) => {
        const newImages = [...prev, asset.imageUrl]
        onInputImagesChange?.(newImages)
        return newImages
      })
    }
    setShowAssetPicker(false)
  }

  const loadGalleryAssets = async (page = 1) => {
    setLoadingGalleryAssets(true)
    try {
      const res = await fetch(`/api/assets?publicOnly=true&page=${page}&limit=20`)
      const data = await res.json()
      if (res.ok && data.assets) {
        const validAssets = data.assets.filter((a: Asset) => a.imageUrl)
        if (page === 1) {
          setGalleryAssets(validAssets)
        } else {
          setGalleryAssets((prev) => [...prev, ...validAssets])
        }
        setHasMoreGallery(validAssets.length === 20 && data.hasMore)
      }
    } catch (error) {
      console.error('加载案例失败:', error)
    } finally {
      setLoadingGalleryAssets(false)
    }
  }

  const handleSelectGalleryAsset = (asset: Asset) => {
    if (!selectedImages.includes(asset.imageUrl)) {
      setSelectedImages((prev) => {
        const newImages = [...prev, asset.imageUrl]
        onInputImagesChange?.(newImages)
        return newImages
      })
    }
  }

  const handleLoadMoreGallery = () => {
    if (!loadingGalleryAssets && hasMoreGallery) {
      const nextPage = galleryPage + 1
      setGalleryPage(nextPage)
      loadGalleryAssets(nextPage)
    }
  }

  const handleCompose = async () => {
    if (!description.trim()) {
      setError('请输入合成提示词')
      return
    }

    if (selectedImages.length === 0) {
      setError('请至少选择一张图片')
      return
    }

    // 如果不允许匿名访问，要求登录并检查使用次数
    if (!allowAnonymous) {
      if (!isLoggedIn || !userId) {
        setError('请先登录后再合成图片')
        onLoginRequest()
        return
      }

      if (currentRemaining === 0 && remaining !== -1) {
        setError('使用次数已用完')
        return
      }
    }
    // 如果允许匿名访问，无论是否登录都不检查使用次数

    setLoading(true)
    setError(null)
    onLoadingChange?.(true)

    try {
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          userId: userId || undefined,
          provider: selectedProvider || undefined,
          model: selectedModel || undefined,
          size,
          inputImageUrls: selectedImages,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          setError('请先登录后再合成图片')
          onLoginRequest()
          return
        }
        throw new Error(data.error || '创建任务失败')
      }

      // 异步任务：保存任务 ID 并开始轮询
      if (data.taskId) {
        setCurrentTaskId(data.taskId)
        // 轮询会在 useTaskPolling hook 中处理
        // 不在这里设置 loading=false，等待任务完成
      } else {
        throw new Error('未返回任务 ID')
      }
    } catch (err: any) {
      setError(err.message || '创建任务失败，请稍后重试')
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">合成提示词</label>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述你想如何合成这些图片。例如：'将两张图片融合，第一张作为背景，第二张叠加在前景，营造梦幻效果。'"
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 resize-none text-sm sm:text-base"
            rows={5}
            maxLength={500}
            disabled={
              loading ||
              (!allowAnonymous && !isLoggedIn && !description.trim()) ||
              (isLoggedIn && currentRemaining === 0 && remaining !== -1)
            }
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">{description.length}/500</div>
        </div>
      </div>

      {/* 图片选择区域 */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择图片 ({selectedImages.length})
        </label>
        <div className="space-y-3">
          {/* 已选择的图片预览 */}
          {selectedImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {selectedImages.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`已选择图片 ${index + 1}`}
                    className="w-full h-24 sm:h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    title="移除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 上传和选择按钮 */}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || uploadingImages.length > 0}
              className="flex-1 min-w-[120px] px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploadingImages.length > 0 ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>上传中...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>上传图片</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowGalleryPicker(!showGalleryPicker)
                if (!showGalleryPicker) {
                  setGalleryPage(1)
                  loadGalleryAssets(1)
                }
              }}
              disabled={loading}
              className="flex-1 min-w-[120px] px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>🎨</span>
              <span>从案例选择</span>
            </button>
            {isLoggedIn && (
              <button
                onClick={() => {
                  setShowAssetPicker(!showAssetPicker)
                  if (!showAssetPicker) {
                    loadAssets()
                  }
                }}
                disabled={loading}
                className="flex-1 min-w-[120px] px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>📚</span>
                <span>从素材库选择</span>
              </button>
            )}
          </div>

          {/* 案例选择器 */}
          {showGalleryPicker && (
            <div className="border border-gray-300 rounded-lg p-3 max-h-96 overflow-y-auto">
              {loadingGalleryAssets && galleryAssets.length === 0 ? (
                <div className="text-center py-4 text-gray-500">加载中...</div>
              ) : galleryAssets.length === 0 ? (
                <div className="text-center py-4 text-gray-500">暂无案例</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {galleryAssets.map((asset) => (
                      <button
                        key={asset.id}
                        onClick={() => handleSelectGalleryAsset(asset)}
                        className="relative aspect-square group"
                      >
                        <img
                          src={asset.imageUrl}
                          alt={asset.description || '案例'}
                          className={`w-full h-full object-cover rounded border-2 transition-all ${
                            selectedImages.includes(asset.imageUrl)
                              ? 'border-green-500 opacity-50'
                              : 'border-gray-200 group-hover:border-blue-500'
                          }`}
                        />
                        {selectedImages.includes(asset.imageUrl) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-50 rounded">
                            <span className="text-white text-xl">✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {hasMoreGallery && (
                    <button
                      onClick={handleLoadMoreGallery}
                      disabled={loadingGalleryAssets}
                      className="w-full px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingGalleryAssets ? '加载中...' : '加载更多'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* 素材库选择器 */}
          {showAssetPicker && (
            <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto">
              {loadingAssets ? (
                <div className="text-center py-4 text-gray-500">加载中...</div>
              ) : assets.length === 0 ? (
                <div className="text-center py-4 text-gray-500">暂无素材</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      className="relative aspect-square group"
                      disabled={selectedImages.includes(asset.imageUrl)}
                    >
                      <img
                        src={asset.imageUrl}
                        alt={asset.description || '素材'}
                        className={`w-full h-full object-cover rounded border-2 transition-all ${
                          selectedImages.includes(asset.imageUrl)
                            ? 'border-green-500 opacity-50'
                            : 'border-gray-200 group-hover:border-blue-500'
                        }`}
                      />
                      {selectedImages.includes(asset.imageUrl) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500 bg-opacity-50 rounded">
                          <span className="text-white text-xl">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {providers.length > 0 && (
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI 模型提供商</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm sm:text-base"
              disabled={loading}
            >
              {providers.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.name === 'openai' ? 'OpenAI 兼容接口' : provider.name}
                  {provider.configured ? '' : ' (未配置)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">模型</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm sm:text-base"
              disabled={loading || !selectedProvider}
            >
              {providers
                .find((p) => p.name === selectedProvider)
                ?.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">尺寸</label>
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm sm:text-base"
              disabled={loading}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!allowAnonymous && !isLoggedIn && (
        <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs sm:text-sm text-yellow-800">合成图片需要登录，每个用户默认可以使用 3 次</p>
        </div>
      )}
      {isLoggedIn && !allowAnonymous && (
        <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800">
            剩余使用次数: <span className="font-semibold">{currentRemaining === -1 ? '无限制' : currentRemaining}</span>
          </p>
        </div>
      )}

      <div className="space-y-2.5 sm:space-y-3">
        <button
          onClick={handleCompose}
          disabled={
            loading ||
            !description.trim() ||
            selectedImages.length === 0 ||
            (isLoggedIn && currentRemaining === 0 && remaining !== -1) ||
            (!allowAnonymous && !isLoggedIn)
          }
          className="w-full px-6 py-3.5 sm:py-4 min-h-[52px] sm:min-h-[56px] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base touch-manipulation whitespace-nowrap"
        >
          {loading || isPolling ? (
            <>
              <span className="animate-spin">⚡</span>
              <span>
                {isPolling && pollingTask?.status === 'processing'
                  ? '处理中...'
                  : '合成中...'}
              </span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>开始合成图片</span>
            </>
          )}
        </button>

        <p className="text-xs text-center text-gray-500 leading-5 min-h-[20px]">
          {!isLoggedIn && !allowAnonymous ? '提示：合成图片需要先登录' : ''}
        </p>
      </div>

      {error && (
        <div className="mt-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-gray-200">
        <a href="#" className="text-xs text-gray-500 hover:text-gray-700 text-center block py-2">
          遇到问题？联系我
        </a>
      </div>
    </div>
  )
}

