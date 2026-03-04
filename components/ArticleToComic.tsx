'use client'

import { useState, useEffect, useRef } from 'react'

const COMIC_DISABLED_MESSAGE = '功能未启用，请联系管理员，微信号为LukePanYY'

interface ArticleToComicProps {
  userId?: string
  remaining: number
  isLoggedIn: boolean
  allowAnonymous?: boolean
  /** 为 false 时入口仍展示，提交时提示联系管理员 */
  comicEnabled?: boolean
  onLoginRequest: () => void
  onImageGenerated?: (imageUrl: string) => void
  onLoadingChange?: (loading: boolean) => void
}

interface TaskStatus {
  id: string
  status: string
  articleTitle?: string
  resultImageUrl?: string
  error?: string
}

export default function ArticleToComic({
  userId,
  remaining,
  isLoggedIn,
  allowAnonymous = false,
  comicEnabled = true,
  onLoginRequest,
  onImageGenerated,
  onLoadingChange,
}: ArticleToComicProps) {
  const [articleUrl, setArticleUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)
  const [currentRemaining, setCurrentRemaining] = useState(remaining)

  const onImageGeneratedRef = useRef(onImageGenerated)
  const onLoadingChangeRef = useRef(onLoadingChange)
  onImageGeneratedRef.current = onImageGenerated
  onLoadingChangeRef.current = onLoadingChange
  const completedFiredRef = useRef<string | null>(null)

  useEffect(() => {
    setCurrentRemaining(remaining)
  }, [remaining])

  // 当轮询拿到 completed 后，用 effect 触发展示（避免在 setInterval 回调里用 ref 导致父组件未更新）
  useEffect(() => {
    if (!taskStatus || !taskId) return
    if (taskStatus.status !== 'completed') return
    if (completedFiredRef.current === taskId) return
    completedFiredRef.current = taskId
    setLoading(false)
    onLoadingChange?.(false)
    const url = taskStatus.resultImageUrl || `/api/comic/${taskId}/image`
    onImageGenerated?.(url)
  }, [taskId, taskStatus, onImageGenerated, onLoadingChange])

  // 轮询任务状态（仅依赖 taskId，避免父组件重渲染导致 interval 被清掉）
  useEffect(() => {
    if (!taskId) return
    completedFiredRef.current = null

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/comic/${taskId}?t=${Date.now()}`, { cache: 'no-store', headers: { Pragma: 'no-cache' } })
        if (!response.ok) {
          throw new Error('查询任务失败')
        }

        const data: TaskStatus = await response.json()
        setTaskStatus(data)

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(pollInterval)
          setLoading(false)
          onLoadingChangeRef.current?.(false)

          if (data.status === 'completed') {
            const url = data.resultImageUrl || (taskId ? `/api/comic/${taskId}/image` : undefined)
            if (url) {
              setTimeout(() => {
                onImageGeneratedRef.current?.(url)
              }, 0)
            }
          }

          if (data.status === 'failed') {
            setError(data.error || '生成失败')
          }
        }
      } catch (err: any) {
        console.error('轮询任务状态失败:', err)
        clearInterval(pollInterval)
        setLoading(false)
        onLoadingChangeRef.current?.(false)
        setError(err.message || '查询任务状态失败')
      }
    }, 1500)

    return () => clearInterval(pollInterval)
  }, [taskId])

  const handleGenerate = async () => {
    if (!comicEnabled) {
      setError(COMIC_DISABLED_MESSAGE)
      return
    }
    if (!articleUrl.trim()) {
      setError('请输入文章链接')
      return
    }

    // 验证 URL 格式：公众号或 GitHub 仓库
    try {
      const urlObj = new URL(articleUrl)
      const isWechat =
        urlObj.hostname === 'mp.weixin.qq.com' ||
        urlObj.hostname === 'www.mp.weixin.qq.com'
      const isGitHub =
        (urlObj.hostname === 'github.com' || urlObj.hostname === 'www.github.com') &&
        /^\/[^/]+\/[^/]+(\/|$)/.test(urlObj.pathname)
      if (!isWechat && !isGitHub) {
        setError('仅支持微信公众号文章链接或 GitHub 仓库链接')
        return
      }
    } catch {
      setError('无效的 URL 格式')
      return
    }

    // 如果不允许匿名访问，要求登录并检查使用次数
    if (!allowAnonymous) {
      if (!isLoggedIn || !userId) {
        setError('请先登录后再生成漫画')
        onLoginRequest()
        return
      }

      if (currentRemaining === 0 && remaining !== -1) {
        setError('使用次数已用完')
        return
      }
    }

    setError(null)
    setLoading(true)
    onLoadingChange?.(true)
    setTaskStatus(null)

    try {
      const response = await fetch('/api/comic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleUrl, userId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '创建任务失败')
      }

      const data = await response.json()
      setTaskId(data.taskId)
    } catch (err: any) {
      console.error('创建任务失败:', err)
      setError(err.message || '创建任务失败')
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const handleReset = () => {
    setTaskId(null)
    setTaskStatus(null)
    setLoading(false)
    onLoadingChange?.(false)
    setError(null)
    setArticleUrl('')
  }

  const getProgressColor = () => {
    if (!taskStatus) return 'bg-orange-500'
    switch (taskStatus.status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-orange-500'
    }
  }

  const getStatusText = () => {
    if (!taskStatus) return '等待处理'
    switch (taskStatus.status) {
      case 'pending':
        return '等待处理'
      case 'processing':
        return '正在生成分镜漫画...'
      case 'completed':
        return '生成完成'
      case 'failed':
        return '生成失败'
      default:
        return '处理中'
    }
  }

  return (
    <div className="space-y-4">
      {!comicEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">{COMIC_DISABLED_MESSAGE}</p>
        </div>
      )}
      {/* 输入区域 */}
      {!taskStatus && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文章或项目链接
            </label>
            <input
              type="url"
              value={articleUrl}
              onChange={(e) => setArticleUrl(e.target.value)}
              placeholder="公众号文章 https://mp.weixin.qq.com/s/... 或 GitHub 仓库 https://github.com/owner/repo"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-gray-500">
              支持微信公众号文章或 GitHub 仓库（将使用 README），AI 将自动提取内容并生成多分镜漫画
            </p>
          </div>

          {/* 剩余次数提示 */}
          {!allowAnonymous && isLoggedIn && (
            <div className="text-sm text-gray-600">
              剩余次数：{remaining === -1 ? '无限制' : currentRemaining}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 生成按钮：未启用时可点击，提交时提示联系管理员 */}
          <button
            onClick={handleGenerate}
            disabled={loading || !articleUrl.trim()}
            className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                生成中...
              </span>
            ) : (
              '生成漫画'
            )}
          </button>
        </>
      )}

      {/* 进度显示 */}
      {taskStatus && taskStatus.status !== 'completed' && taskStatus.status !== 'failed' && (
        <div className="space-y-3">
          <div className="overflow-hidden h-2 rounded-full bg-gray-200">
            <div
              className={`h-full animate-pulse min-w-[20%] max-w-[80%] rounded-full transition-all ${getProgressColor()}`}
              style={{ width: taskStatus.status === 'processing' ? '70%' : '30%' }}
            />
          </div>
          <p className="text-sm text-gray-600 text-center">{getStatusText()}</p>
        </div>
      )}

      {/* 完成状态 */}
      {taskStatus && taskStatus.status === 'completed' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-green-500 text-xl mr-3">✓</span>
              <div>
                <h3 className="text-green-800 font-medium">生成完成</h3>
                <p className="text-green-600 text-sm mt-1">
                  漫画已成功生成，请在右侧查看
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            生成新的漫画
          </button>
        </div>
      )}

      {/* 失败状态 */}
      {taskStatus && taskStatus.status === 'failed' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-red-500 text-xl mr-3">⚠️</span>
              <div className="flex-1">
                <h3 className="text-red-800 font-medium">生成失败</h3>
                <p className="text-red-600 text-sm mt-1">{taskStatus.error || error}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full py-3 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            重新开始
          </button>
        </div>
      )}
    </div>
  )
}
