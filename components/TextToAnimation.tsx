'use client'

import { useState, useEffect, useRef } from 'react'

type Format = 'svg' | 'h5'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 90
const ANIMATION_DISABLED_MESSAGE = '文生动画未开启，请设置 ANIMATION_ENABLED=true 并配置 UniAPI'

interface TextToAnimationProps {
  userId?: string
  remaining: number
  isLoggedIn: boolean
  allowAnonymous?: boolean
  animationEnabled?: boolean
  onLoginRequest: () => void
  onImageGenerated?: (url: string) => void
  onLoadingChange?: (loading: boolean) => void
}

export default function TextToAnimation({
  userId,
  remaining,
  isLoggedIn,
  allowAnonymous = false,
  animationEnabled = false,
  onLoginRequest,
  onImageGenerated,
  onLoadingChange,
}: TextToAnimationProps) {
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<Format>('svg')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const completedFiredRef = useRef<string | null>(null)
  const onImageGeneratedRef = useRef(onImageGenerated)
  const onLoadingChangeRef = useRef(onLoadingChange)
  onImageGeneratedRef.current = onImageGenerated
  onLoadingChangeRef.current = onLoadingChange

  useEffect(() => {
    if (!taskId) return
    completedFiredRef.current = null
    let attempts = 0

    const poll = async () => {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setError('处理超时，请稍后在任务列表中查看')
        setLoading(false)
        onLoadingChangeRef.current?.(false)
        return
      }
      try {
        const r = await fetch(`/api/tasks/${taskId}`)
        let t: { status?: string; resultImageUrl?: string; error?: string }
        try {
          const text = await r.text()
          if (!text || (text.trim() !== '' && !text.trim().startsWith('{') && !text.trim().startsWith('['))) {
            setError('获取任务状态异常，请稍后重试')
            setLoading(false)
            onLoadingChangeRef.current?.(false)
            return
          }
          t = text ? JSON.parse(text) : {}
        } catch {
          setError('获取任务状态异常，请稍后重试')
          setLoading(false)
          onLoadingChangeRef.current?.(false)
          return
        }
        if (t.status === 'completed' && t.resultImageUrl) {
          if (completedFiredRef.current !== taskId) {
            completedFiredRef.current = taskId
            setLoading(false)
            onLoadingChangeRef.current?.(false)
            onImageGeneratedRef.current?.(t.resultImageUrl)
          }
          return
        }
        if (t.status === 'failed' || t.status === 'expired') {
          setError(t.error || '任务失败')
          setLoading(false)
          onLoadingChangeRef.current?.(false)
          return
        }
        attempts++
        setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        attempts++
        setTimeout(poll, POLL_INTERVAL_MS)
      }
    }
    setTimeout(poll, POLL_INTERVAL_MS)
  }, [taskId])

  const getUserId = (): string | undefined => userId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    if (!animationEnabled) {
      setError(ANIMATION_DISABLED_MESSAGE)
      return
    }
    if (!allowAnonymous && !isLoggedIn) {
      onLoginRequest()
      return
    }

    setLoading(true)
    setError(null)
    onLoadingChange?.(true)

    try {
      const res = await fetch('/api/animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          format,
          userId: getUserId(),
        }),
      })
      let data: { taskId?: string; error?: string }
      try {
        const text = await res.text()
        if (!text || (text.trim() !== '' && !text.trim().startsWith('{') && !text.trim().startsWith('['))) {
          setError(res.status >= 400 ? `请求失败（${res.status}）` : '响应格式异常，请稍后重试')
          setLoading(false)
          onLoadingChange?.(false)
          return
        }
        data = text ? JSON.parse(text) : {}
      } catch {
        setError(res.status >= 400 ? `请求失败（${res.status}）` : '响应解析异常，请稍后重试')
        setLoading(false)
        onLoadingChange?.(false)
        return
      }

      if (!res.ok) {
        setError(data?.error || `请求失败（${res.status}）`)
        setLoading(false)
        onLoadingChange?.(false)
        return
      }
      if (!data.taskId) {
        setError('未返回任务 ID')
        setLoading(false)
        onLoadingChange?.(false)
        return
      }
      setTaskId(data.taskId)
    } catch (err: any) {
      setError(err?.message || '网络错误')
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  if (!allowAnonymous && !isLoggedIn) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">请先登录后使用文生动画。</p>
        <button
          type="button"
          onClick={onLoginRequest}
          className="w-full py-2.5 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
        >
          微信登录
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：一个红色圆球从左向右弹跳，循环 3 秒"
              rows={5}
              maxLength={2000}
              className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 resize-none text-sm sm:text-base"
              disabled={loading}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">{description.length}/2000</div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">输出格式</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
            disabled={loading}
          >
            <option value="svg">SVG</option>
            <option value="h5">H5（HTML5）</option>
          </select>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 text-red-700 text-sm p-2">{error}</div>
        )}
        <button
          type="submit"
          disabled={!description.trim() || loading}
          className="w-full rounded-lg bg-orange-500 text-white py-2.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '生成中…' : '生成动画'}
        </button>
      </form>
    </div>
  )
}
