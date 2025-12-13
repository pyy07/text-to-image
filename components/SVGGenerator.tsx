'use client'

import { useState, useEffect } from 'react'

type ContentType = 'svg' | 'html'

interface SVGGeneratorProps {
  userId?: string
  remaining: number
  isLoggedIn: boolean
  allowAnonymous?: boolean
  onLoginRequest: () => void
  code?: string | null // 外部传入的代码
  contentType?: ContentType // 外部传入的内容类型
  onCodeGenerated?: (code: string, contentType: ContentType) => void // 代码生成后的回调
  onLoadingChange?: (loading: boolean) => void // 加载状态变化回调
}

interface Provider {
  name: string
  configured: boolean
  models: string[]
}

export default function SVGGenerator({
  userId,
  remaining,
  isLoggedIn,
  allowAnonymous = false,
  onLoginRequest,
  code: externalCode,
  contentType: externalContentType,
  onCodeGenerated,
  onLoadingChange,
}: SVGGeneratorProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState<string | null>(externalCode || null)
  const [contentType, setContentType] = useState<ContentType>(externalContentType || 'svg')
  const [error, setError] = useState<string | null>(null)
  const [currentRemaining, setCurrentRemaining] = useState(remaining)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [baseCode, setBaseCode] = useState<string | null>(null)
  const [baseDescription, setBaseDescription] = useState<string>('')

  // 同步外部传入的代码和类型
  useEffect(() => {
    if (externalCode !== undefined) {
      setCode(externalCode)
    }
  }, [externalCode])

  useEffect(() => {
    if (externalContentType !== undefined) {
      setContentType(externalContentType)
    }
  }, [externalContentType])

  useEffect(() => {
    // 获取可用的 providers
    fetch('/api/providers')
      .then((res) => res.json())
      .then((data) => {
        if (data.providers && data.providers.length > 0) {
          setProviders(data.providers)
          
          // 使用后端返回的默认 Provider（考虑环境变量配置）
          const defaultProvider = data.defaultProvider || data.providers[0].name
          setSelectedProvider(defaultProvider)
          
          // 设置对应 Provider 的默认模型
          const provider = data.providers.find((p: Provider) => p.name === defaultProvider) || data.providers[0]
          if (provider.models.length > 0) {
            setSelectedModel(provider.models[0])
          }
        }
      })
      .catch((error) => {
        console.error('获取 Provider 列表失败:', error)
      })
  }, [])

  // 当选择的 provider 改变时，更新 model
  useEffect(() => {
    const provider = providers.find((p) => p.name === selectedProvider)
    if (provider && provider.models.length > 0) {
      setSelectedModel(provider.models[0])
    }
  }, [selectedProvider, providers])

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('请输入描述')
      return
    }

    // 如果允许匿名访问，跳过登录检查
    if (!allowAnonymous) {
      if (!isLoggedIn || !userId) {
        setError(`请先登录后再生成${contentType === 'html' ? 'H5动画' : 'SVG'}`)
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
    if (onLoadingChange) {
      onLoadingChange(true)
    }

    try {
      // 如果已有代码，说明是修改模式
      const isModifying = !!code

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          userId: userId || undefined, // 匿名访问时不传 userId
          provider: selectedProvider || undefined,
          model: selectedModel || undefined,
          contentType,  // 添加内容类型
          // 修改模式：传递当前代码和当前描述作为基础
          baseSVG: isModifying && code ? code : undefined,
          baseDescription: isModifying && description ? description : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setError(`请先登录后再生成${contentType === 'html' ? 'H5动画' : 'SVG'}`)
          onLoginRequest()
          return
        }
        throw new Error(data.error || '生成失败')
      }

      const generatedCode = data.code || data.svgCode
      setCode(generatedCode)
      // 通知父组件代码已生成
      if (onCodeGenerated) {
        onCodeGenerated(generatedCode, contentType)
      }
      
      // 如果返回了剩余次数，更新它
      if (data.remaining !== undefined) {
        setCurrentRemaining(data.remaining)
      }
      
      // 如果当前已有代码，说明是修改模式
      if (code) {
        // 修改模式：将新生成的代码设为新的基础代码，清空描述以便下次修改
        setBaseCode(generatedCode)
        setBaseDescription(description)
        setDescription('')
      } else {
        // 新建模式：清空描述
        setDescription('')
      }
    } catch (err: any) {
      setError(err.message || '生成失败，请稍后重试')
    } finally {
      setLoading(false)
      if (onLoadingChange) {
        onLoadingChange(false)
      }
    }
  }

  return (
    <div className="w-full h-full flex flex-col">

      {/* 内容类型选择 */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          生成类型
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!code) setContentType('svg')
            }}
            disabled={loading || !!code}
            className={`flex-1 px-4 py-2.5 sm:py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              contentType === 'svg'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            } ${(loading || !!code) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="mr-1.5">🎨</span>
            SVG 动画
          </button>
          <button
            type="button"
            onClick={() => {
              if (!code) setContentType('html')
            }}
            disabled={loading || !!code}
            className={`flex-1 px-4 py-2.5 sm:py-2 rounded-lg border-2 text-sm font-medium transition-all ${
              contentType === 'html'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            } ${(loading || !!code) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="mr-1.5">✨</span>
            H5 动画
          </button>
        </div>
        {code && (
          <p className="text-xs text-gray-500 mt-1.5">
            提示：点击&ldquo;重新生成&rdquo;可切换类型
          </p>
        )}
      </div>

      {/* 动画描述 */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          动画描述
        </label>
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述你想创建的动画，越详细越好。例如：'模拟一个二叉树的遍历过程，节点在被访问时变色，背景使用深色网格。'"
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 resize-none text-sm sm:text-base"
            rows={5}
            maxLength={500}
            disabled={
              loading ||
              (!allowAnonymous && !isLoggedIn && !description.trim()) ||
              (isLoggedIn && currentRemaining === 0 && remaining !== -1)
            }
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {description.length}/500
          </div>
        </div>
      </div>

      {/* Provider 和 Model 选择 */}
      {providers.length > 0 && (
        <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI 模型提供商
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm sm:text-base"
              disabled={loading}
            >
              {providers.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.name === 'gemini' ? 'Google Gemini' : 'OpenAI'} 
                  {provider.configured ? '' : ' (未配置)'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模型
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2.5 sm:p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm sm:text-base"
              disabled={loading || !selectedProvider}
            >
              {providers
                .find((p) => p.name === selectedProvider)
                ?.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* 用户信息提示 */}
      {!allowAnonymous && !isLoggedIn && (
        <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs sm:text-sm text-yellow-800">
            生成 SVG 需要登录，每个用户默认可以使用 3 次
          </p>
        </div>
      )}
      {isLoggedIn && (
        <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800">
            剩余使用次数:{' '}
            <span className="font-semibold">
              {currentRemaining === -1 ? '无限制' : currentRemaining}
            </span>
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* 主按钮 + 重新生成（同一行/同一高度，避免生成后新增一整行导致布局变形） */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleGenerate}
            disabled={
              loading ||
              !description.trim() ||
              (isLoggedIn && currentRemaining === 0 && remaining !== -1) ||
              (!allowAnonymous && !isLoggedIn)
            }
            className="flex-1 px-6 py-3.5 sm:py-4 min-h-[52px] sm:min-h-[56px] bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base touch-manipulation whitespace-nowrap"
          >
            {loading ? (
              <>
                <span className="animate-spin">⚡</span>
                <span>生成中...</span>
              </>
            ) : code ? (
              <>
                <span>⚡</span>
                <span>修改动画</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>开始生成动画</span>
              </>
            )}
          </button>

          {code && (
            <button
              onClick={() => {
                setCode(null)
                setBaseCode(null)
                setBaseDescription('')
                setDescription('')
                // 通知父组件清除代码
                if (onCodeGenerated) {
                  onCodeGenerated('', contentType)
                }
              }}
              disabled={loading}
              className="sm:w-40 w-full px-4 py-3.5 sm:py-4 min-h-[52px] sm:min-h-[56px] text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation whitespace-nowrap"
              title={`清除当前${contentType === 'html' ? 'H5动画' : 'SVG'}，重新生成`}
            >
              重新生成
            </button>
          )}
        </div>

        {/* 固定高度的小提示：避免生成后出现大块提示卡片导致页面高度变化 */}
        <p className="text-xs text-center text-gray-500 leading-5 min-h-[20px]">
          {!isLoggedIn && !allowAnonymous
            ? '提示：生成动画需要先登录'
            : code
              ? `💡 输入新的描述可以修改当前${contentType === 'html' ? 'H5动画' : 'SVG'}，或点击“重新生成”创建全新的动画`
              : ''}
        </p>
      </div>

      {error && (
        <div className="mt-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* 生成后的“提示卡片”会撑高右侧面板导致布局变形，已改为上方的一行固定高度提示 */}

      {/* 底部链接：用 mt-auto 贴底，避免右侧面板出现“内容没撑满导致底部空一截”的视觉落差 */}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <a
          href="#"
          className="text-xs text-gray-500 hover:text-gray-700 text-center block py-2"
        >
          遇到问题？联系我
        </a>
      </div>
    </div>
  )
}

