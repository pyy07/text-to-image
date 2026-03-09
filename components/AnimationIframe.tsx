'use client'

import { useState, useEffect } from 'react'

interface AnimationIframeProps {
  url: string | null
  title?: string
  className?: string
  sandbox?: string
}

/**
 * 通过 fetch + srcdoc 展示 H5/SVG 动画，避免 blob URL 在 iframe src 下白屏。
 * 用于案例页等列表中的动画预览。
 */
export default function AnimationIframe({ url, title, className, sandbox = 'allow-scripts allow-same-origin allow-forms' }: AnimationIframeProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!url) {
      setContent(null)
      return
    }
    setLoading(true)
    setContent(null)
    fetch(url, { cache: 'no-store' })
      .then((r) => r.text())
      .then((text) => setContent(text))
      .catch(() => setContent(null))
      .finally(() => setLoading(false))
  }, [url])

  if (!url) return <div className="text-gray-500 text-sm">无预览</div>
  if (loading) return <div className="text-gray-400 text-xs">加载中...</div>
  if (content) {
    return (
      <iframe
        srcDoc={content}
        title={title ?? '动画预览'}
        className={className}
        sandbox={sandbox}
      />
    )
  }
  return (
    <iframe
      src={url}
      title={title ?? '动画预览'}
      className={className}
      sandbox={sandbox}
    />
  )
}
