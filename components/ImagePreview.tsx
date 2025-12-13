'use client'

import { useState } from 'react'

interface ImagePreviewProps {
  imageUrl: string | null
  loading: boolean
}

export default function ImagePreview({ imageUrl, loading }: ImagePreviewProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!imageUrl) return
    try {
      await navigator.clipboard.writeText(imageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('复制失败:', e)
    }
  }

  return (
    <div className="w-full flex-1 relative flex flex-col min-h-0">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-700">生成中...</p>
          </div>
        </div>
      ) : imageUrl ? (
        <>
          <div className="flex justify-between items-center mb-2 flex-shrink-0 relative z-10">
            <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">IMG</span>
            <div className="flex gap-2">
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                title="新窗口打开"
              >
                打开
              </a>
              <button
                onClick={handleCopy}
                className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                title="复制图片链接"
              >
                {copied ? '已复制' : '复制链接'}
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-4 sm:p-8 overflow-hidden">
            <div className="w-full h-full overflow-auto flex items-center justify-center">
              <img
                src={imageUrl}
                alt="生成图片预览"
                className="max-w-full max-h-full rounded-lg border border-gray-200 shadow-sm object-contain bg-white"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-lg text-gray-700">图片预览面板</p>
            <p className="text-sm mt-2 text-gray-500">生成的图片将在这里显示</p>
          </div>
        </div>
      )}
    </div>
  )
}


