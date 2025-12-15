'use client'

import { useEffect, useState } from 'react'
import { useTaskPolling } from '@/lib/hooks/useTaskPolling'

interface ImageGeneratorProps {
  userId?: string
  remaining: number
  isLoggedIn: boolean
  allowAnonymous?: boolean
  onLoginRequest: () => void
  imageUrl?: string | null
  onImageGenerated?: (imageUrl: string) => void
  onLoadingChange?: (loading: boolean) => void
  onImageUpload?: (file: File) => void
  uploadingImage?: boolean
  onModeChange?: (mode: 'generate' | 'edit', inputImageUrl?: string | null) => void
}

interface Provider {
  name: string
  configured: boolean
  models: string[]
}

const SIZES = ['1024x1024', '768x768', '512x512']

export default function ImageGenerator({
  userId,
  remaining,
  isLoggedIn,
  allowAnonymous = false,
  onLoginRequest,
  imageUrl,
  onImageGenerated,
  onLoadingChange,
  onImageUpload,
  uploadingImage = false,
  onModeChange,
}: ImageGeneratorProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRemaining, setCurrentRemaining] = useState(remaining)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [size, setSize] = useState<string>(SIZES[0])
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)

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

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('请输入描述')
      return
    }

    if (!allowAnonymous) {
      if (!isLoggedIn || !userId) {
        setError('请先登录后再生成图片')
        onLoginRequest()
        return
      }

      if (currentRemaining === 0 && remaining !== -1) {
        setError('使用次数已用完')
        return
      }
    }

    setLoading(true)
    setError(null)
    onLoadingChange?.(true)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          userId: userId || undefined,
          provider: selectedProvider || undefined,
          model: selectedModel || undefined,
          size,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          setError('请先登录后再生成图片')
          onLoginRequest()
          return
        }
        throw new Error(data.error || '生成失败')
      }

      if (typeof data.imageUrl === 'string' && data.imageUrl) {
        onImageGenerated?.(data.imageUrl)
      } else {
        throw new Error('生成成功但未返回图片地址')
      }

      if (data.remaining !== undefined) {
        setCurrentRemaining(data.remaining)
      }

      // 保留提示词，不清空
    } catch (err: any) {
      setError(err.message || '生成失败，请稍后重试')
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const hasPreview = !!imageUrl
  const currentMode = hasPreview ? 'edit' : 'generate'

  // 轮询任务状态
  const { task: pollingTask, isPolling } = useTaskPolling({
    taskId: currentTaskId,
    userId,
    onCompleted: (task) => {
      if (task.resultImageUrl) {
        onImageGenerated?.(task.resultImageUrl)
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

  // 通知父组件模式变化
  useEffect(() => {
    onModeChange?.(currentMode, hasPreview ? imageUrl : null)
  }, [currentMode, imageUrl, hasPreview, onModeChange])

  const handleEdit = async () => {
    if (!description.trim()) {
      setError('请输入编辑指令')
      return
    }

    if (!imageUrl) {
      setError('当前没有预览图片，无法修改。请先生成或上传一张图片。')
      return
    }

    if (!allowAnonymous) {
      if (!isLoggedIn || !userId) {
        setError('请先登录后再编辑图片')
        onLoginRequest()
        return
      }

      if (currentRemaining === 0 && remaining !== -1) {
        setError('使用次数已用完')
        return
      }
    }

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
          inputImageUrl: imageUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          setError('请先登录后再编辑图片')
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

  const handlePrimaryAction = async () => {
    // 预览有图 → 修改；无图 → 生成
    if (hasPreview) return await handleEdit()
    return await handleGenerate()
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">{hasPreview ? '编辑指令' : '图片描述'}</label>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              hasPreview
                ? "描述你想如何修改这张图。例如：'把天空改成黄昏，并增加柔和的橙色光晕。'"
                : "描述你想生成的图片，越详细越好。例如：'赛博朋克夜景街道，霓虹灯反射在雨水路面，电影感灯光，高清细节。'"
            }
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
          <p className="text-xs sm:text-sm text-yellow-800">生成图片需要登录，每个用户默认可以使用 3 次</p>
        </div>
      )}
      {isLoggedIn && (
        <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800">
            剩余使用次数: <span className="font-semibold">{currentRemaining === -1 ? '无限制' : currentRemaining}</span>
          </p>
        </div>
      )}

      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handlePrimaryAction}
            disabled={
              loading ||
              !description.trim() ||
              (isLoggedIn && currentRemaining === 0 && remaining !== -1) ||
              (!allowAnonymous && !isLoggedIn)
            }
            className="flex-1 px-6 py-3.5 sm:py-4 min-h-[52px] sm:min-h-[56px] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base touch-manipulation whitespace-nowrap"
          >
            {loading || isPolling ? (
              <>
                <span className="animate-spin">⚡</span>
                <span>
                  {isPolling && pollingTask?.status === 'processing'
                    ? '处理中...'
                    : hasPreview
                    ? '编辑中...'
                    : '生成中...'}
                </span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>{hasPreview ? '基于预览图修改' : '开始生成图片'}</span>
              </>
            )}
          </button>

          {imageUrl && (
            <button
              onClick={() => {
                onImageGenerated?.('')
                onModeChange?.('generate', null)
              }}
              disabled={loading}
              className="sm:w-40 w-full px-4 py-3.5 sm:py-4 min-h-[52px] sm:min-h-[56px] text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation whitespace-nowrap"
              title="清除当前预览"
            >
              清除预览
            </button>
          )}
        </div>

        <p className="text-xs text-center text-gray-500 leading-5 min-h-[20px]">
          {!isLoggedIn && !allowAnonymous ? '提示：生成图片需要先登录' : ''}
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


