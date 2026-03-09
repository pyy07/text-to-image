'use client'

import { useState, useRef, useEffect } from 'react'

interface ImagePreviewProps {
  imageUrl: string | null // 输出图片（结果）
  inputImageUrl?: string | null // 输入图片（单张，用于修改模式）
  inputImageUrls?: string[] // 输入图片（多张，用于合成模式）
  loading: boolean
  mode?: 'generate' | 'edit' | 'compose' | 'comic' | 'animation' // 当前模式
  onImageUpload?: (file: File) => void
  uploading?: boolean
}

export default function ImagePreview({ 
  imageUrl, 
  inputImageUrl,
  inputImageUrls,
  loading, 
  mode = 'generate',
  onImageUpload, 
  uploading = false 
}: ImagePreviewProps) {
  const [copied, setCopied] = useState(false)
  const [animationContent, setAnimationContent] = useState<string | null>(null)
  const [animationContentLoading, setAnimationContentLoading] = useState(false)
  const [showCodeView, setShowCodeView] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 动画模式：拉取内容用于 srcdoc 展示（避免 H5 白屏）并支持查看代码
  useEffect(() => {
    if (mode !== 'animation' || !imageUrl) {
      setAnimationContent(null)
      setShowCodeView(false)
      return
    }
    setAnimationContentLoading(true)
    setAnimationContent(null)
    fetch(imageUrl, { cache: 'no-store' })
      .then((r) => r.text())
      .then((text) => setAnimationContent(text))
      .catch(() => setAnimationContent(null))
      .finally(() => setAnimationContentLoading(false))
  }, [mode, imageUrl])

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onImageUpload) {
      onImageUpload(file)
    }
    // 重置 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const hasOutput = !!imageUrl

  return (
    <div className="w-full flex-1 relative flex flex-col min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
        disabled={loading || uploading}
      />
      
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-700">
              {mode === 'generate' ? '生成中...' : mode === 'edit' ? '修改中...' : mode === 'comic' ? '生成漫画分镜中...' : mode === 'animation' ? '生成动画中...' : '合成中...'}
            </p>
          </div>
        </div>
      ) : hasOutput ? (
        <>
          {/* 模式标签和操作按钮 */}
          <div className="flex justify-between items-center mb-2 flex-shrink-0 relative z-10">
            <div className="flex items-center gap-2">
              {mode === 'generate' && <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">文生图</span>}
              {mode === 'edit' && <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700">修改图片</span>}
              {mode === 'compose' && <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">合成图片</span>}
              {mode === 'comic' && <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">文生漫</span>}
              {mode === 'animation' && <span className="px-2 py-0.5 text-xs rounded bg-teal-100 text-teal-700">文生动</span>}
            </div>
            <div className="flex gap-2">
              {mode === 'generate' && onImageUpload && (
                <button
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                  title="上传图片"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>上传中</span>
                    </>
                  ) : (
                    <>
                      <span>📤</span>
                      <span>上传</span>
                    </>
                  )}
                </button>
              )}
              {mode === 'animation' && (
                <button
                  type="button"
                  onClick={() => setShowCodeView((v) => !v)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg transition-colors"
                  title={showCodeView ? '查看动画' : '查看代码'}
                >
                  {showCodeView ? '查看动画' : '查看代码'}
                </button>
              )}
              <a
                href={imageUrl!}
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

          {/* 输出图片区域：动画模式用 srcdoc 避免 H5 白屏，并支持查看代码；足够高度+可滚动避免截断 */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-300 p-4 sm:p-8 overflow-hidden flex flex-col">
            <div className="w-full flex-1 min-h-0 overflow-auto flex flex-col items-center">
              {mode === 'animation' ? (
                showCodeView ? (
                  <pre className="w-full flex-shrink-0 min-h-[320px] text-xs sm:text-sm p-4 bg-gray-900 text-gray-100 rounded-lg border border-gray-200 overflow-auto whitespace-pre-wrap break-all">
                    {animationContentLoading ? '加载中...' : animationContent ?? '无法加载内容'}
                  </pre>
                ) : animationContentLoading ? (
                  <div className="text-gray-500 py-8">加载动画中...</div>
                ) : animationContent ? (
                  <iframe
                    srcDoc={animationContent}
                    title="动画预览"
                    className="w-full min-h-[520px] sm:min-h-[640px] rounded-lg border border-gray-200 shadow-sm bg-white flex-shrink-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <iframe
                    src={imageUrl!}
                    title="动画预览"
                    className="w-full min-h-[520px] sm:min-h-[640px] rounded-lg border border-gray-200 shadow-sm bg-white flex-shrink-0"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                )
              ) : (
                <img
                  src={imageUrl!}
                  alt="生成图片预览"
                  className="max-w-full max-h-full rounded-lg border border-gray-200 shadow-sm object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">
                {mode === 'comic' ? '🎨' : mode === 'animation' ? '🎬' : '🖼️'}
              </div>
              <p className="text-lg text-gray-700 mb-2">
                {mode === 'comic' ? '漫画分镜预览' : mode === 'animation' ? '动画预览' : '图片预览面板'}
              </p>
              <p className="text-sm text-gray-500">
                {mode === 'generate' && '输入提示词生成图片，或上传图片进行修改'}
                {mode === 'edit' && '上传图片后输入修改指令'}
                {mode === 'compose' && '选择多张图片后输入合成指令'}
                {mode === 'comic' && '输入公众号文章链接，生成漫画分镜总结'}
                {mode === 'animation' && '文生动：输入描述生成 SVG 或 H5 动画'}
              </p>
            </div>
            {onImageUpload && mode === 'generate' && (
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto touch-manipulation"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">📤</span>
                    <span>上传图片</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


