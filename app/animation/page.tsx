'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'

type Format = 'svg' | 'h5'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 90

export default function AnimationPage() {
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<Format>('svg')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'polling' | 'done' | 'error'>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const getUserId = (): string | undefined => {
    if (typeof window === 'undefined') return undefined
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return undefined
      const payload = JSON.parse(atob(token))
      return payload?.userId
    } catch {
      return undefined
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    setStatus('submitting')
    setErrorMessage(null)
    setResultUrl(null)

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

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data?.error || `请求失败（${res.status}）`)
        setStatus('error')
        return
      }

      if (!data.taskId) {
        setErrorMessage('未返回任务 ID')
        setStatus('error')
        return
      }

      setTaskId(data.taskId)
      setStatus('polling')

      let attempts = 0
      const poll = async () => {
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setErrorMessage('处理超时，请稍后在任务列表中查看')
          setStatus('error')
          return
        }
        const r = await fetch(`/api/tasks/${data.taskId}`)
        const t = await r.json()
        if (t.status === 'completed' && t.resultImageUrl) {
          setResultUrl(t.resultImageUrl)
          setStatus('done')
          return
        }
        if (t.status === 'failed' || t.status === 'expired') {
          setErrorMessage(t.error || '任务失败')
          setStatus('error')
          return
        }
        attempts++
        setTimeout(poll, POLL_INTERVAL_MS)
      }
      setTimeout(poll, POLL_INTERVAL_MS)
    } catch (err: any) {
      setErrorMessage(err?.message || '网络错误')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">文生动画</h1>
        <p className="text-sm text-gray-500 mb-6">
          输入描述，生成 SVG 或 H5 动画。需开启 ANIMATION_ENABLED 并配置 UniAPI。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：一个红色圆球从左向右弹跳，循环 3 秒"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              disabled={status === 'submitting' || status === 'polling'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">输出格式</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              disabled={status === 'submitting' || status === 'polling'}
            >
              <option value="svg">SVG</option>
              <option value="h5">H5（HTML5）</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!description.trim() || status === 'submitting' || status === 'polling'}
            className="w-full rounded-lg bg-orange-500 text-white py-2.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'submitting' || status === 'polling'
              ? status === 'polling'
                ? '生成中…'
                : '提交中…'
              : '生成动画'}
          </button>
        </form>

        {status === 'polling' && taskId && (
          <p className="mt-4 text-sm text-gray-500">任务 ID：{taskId}</p>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        {status === 'done' && resultUrl && (
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-700 mb-2">结果</p>
            <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
              {resultUrl.endsWith('.svg') || resultUrl.includes('image/svg') ? (
                <iframe
                  src={resultUrl}
                  title="SVG 动画"
                  className="w-full h-80 border-0"
                  sandbox="allow-scripts"
                />
              ) : (
                <iframe
                  src={resultUrl}
                  title="H5 动画"
                  className="w-full h-96 border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              )}
            </div>
            <a
              href={resultUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-orange-600 hover:underline"
            >
              在新标签页打开
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
