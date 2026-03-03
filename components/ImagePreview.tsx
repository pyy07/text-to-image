'use client'

import { useState, useRef } from 'react'

interface ImagePreviewProps {
  imageUrl: string | null // 输出图片（结果）
  inputImageUrl?: string | null // 输入图片（单张，用于修改模式）
  inputImageUrls?: string[] // 输入图片（多张，用于合成模式）
  loading: boolean
  mode?: 'generate' | 'edit' | 'compose' | 'comic' // 当前模式
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
              {mode === 'generate' ? '生成中...' : mode === 'edit' ? '修改中...' : mode === 'comic' ? '生成漫画分镜中...' : '合成中...'}
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

          {/* 输出图片区域 */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-300 p-4 sm:p-8 overflow-hidden">
            <div className="w-full h-full overflow-auto flex items-center justify-center">
              <img
                src={imageUrl!}
                alt="生成图片预览"
                className="max-w-full max-h-full rounded-lg border border-gray-200 shadow-sm object-contain bg-white"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-6">
              <div className="text-6xl mb-4">
                {mode === 'comic' ? '🎨' : '🖼️'}
              </div>
              <p className="text-lg text-gray-700 mb-2">
                {mode === 'comic' ? '漫画分镜预览' : '图片预览面板'}
              </p>
              <p className="text-sm text-gray-500">
                {mode === 'generate' && '输入提示词生成图片，或上传图片进行修改'}
                {mode === 'edit' && '上传图片后输入修改指令'}
                {mode === 'compose' && '选择多张图片后输入合成指令'}
                {mode === 'comic' && '输入公众号文章链接，生成漫画分镜总结'}
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


