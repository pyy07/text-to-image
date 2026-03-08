'use client'

import { useEffect, useState } from 'react'
import Navigation from '@/components/Navigation'
import ImageGenerator from '@/components/ImageGenerator'
import ImagePreview from '@/components/ImagePreview'

type Modality = 'all' | 'image' | 'video' | 'audio' | 'text' | 'music'

const MODALITIES: { key: Modality; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'image', label: 'image' },
  { key: 'video', label: 'video' },
  { key: 'audio', label: 'audio' },
  { key: 'text', label: 'text' },
  { key: 'music', label: 'music' },
]

type TrialModalityKey = 'image' | 'video' | 'audio' | 'text' | 'music'

interface User {
  id: string
  nickname?: string
  usageCount: number
  maxUsage: number
  isPermanent: boolean
  remaining: number
}

const DEFAULT_TRIAL_MODELS: Record<TrialModalityKey, string[]> = {
  image: [],
  video: [],
  audio: [],
  text: [],
  music: [],
}

export default function TrialPage() {
  const [modality, setModality] = useState<Modality>('image')
  const [user, setUser] = useState<User | null>(null)
  const [trialModels, setTrialModels] = useState<Record<TrialModalityKey, string[]>>(DEFAULT_TRIAL_MODELS)
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  useEffect(() => {
    fetch('/api/trial-models')
      .then((r) => r.json())
      .then((data) => {
        setTrialModels((prev) => ({
          ...prev,
          image: Array.isArray(data.image) ? data.image : [],
          video: Array.isArray(data.video) ? data.video : [],
          audio: Array.isArray(data.audio) ? data.audio : [],
          text: Array.isArray(data.text) ? data.text : [],
          music: Array.isArray(data.music) ? data.music : [],
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) {
      setLoading(false)
      return
    }
    let userId: string
    try {
      const payload = JSON.parse(atob(token))
      userId = payload.userId
      if (!userId) {
        setLoading(false)
        return
      }
    } catch {
      setLoading(false)
      return
    }

    fetch('/api/user', { headers: { 'x-user-id': userId } })
      .then((r) => r.json())
      .then((userData) => {
        if (userData?.id) {
          const remaining = userData.isPermanent
            ? -1
            : Math.max(0, (userData.maxUsage ?? 0) - (userData.usageCount ?? 0))
          setUser({
            id: userData.id,
            nickname: userData.nickname,
            usageCount: userData.usageCount ?? 0,
            maxUsage: userData.maxUsage ?? 0,
            isPermanent: userData.isPermanent ?? false,
            remaining,
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleWechatLogin = () => {
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="h-screen overflow-hidden flex flex-col">
        <Navigation />
        <main className="flex-1 overflow-hidden flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-500 border-t-transparent" />
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Navigation />
      <main className="flex-1 overflow-hidden pt-1 px-2 pb-2 sm:px-3 sm:pb-3 lg:px-6 lg:pb-6">
        <div className="h-full max-w-screen-2xl mx-auto">
          <div className="h-full bg-gray-50 rounded-xl shadow-sm border border-white/50 px-3 sm:px-4 lg:px-6 pt-2 sm:pt-3 pb-4 sm:pb-6 flex flex-col min-h-0">
            {/* 模态选择条 */}
            <div className="mb-4 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500 mr-1">模态</span>
                {MODALITIES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setModality(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      modality === key
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 按模态展示不同输入输出界面 */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row bg-white rounded-lg border border-gray-200 shadow-sm">
            {modality === 'all' && (
              <div className="flex-1 p-8 flex items-center justify-center text-gray-500">
                <p>请选择上方模态开始试用</p>
              </div>
            )}

            {modality === 'image' && (
              <>
                <div className="flex-1 min-h-0 border-b lg:border-b-0 lg:border-r border-gray-200 min-h-[200px] lg:min-h-0 flex flex-col overflow-hidden">
                  <ImagePreview
                    imageUrl={imageUrl}
                    loading={imageLoading}
                    mode="generate"
                  />
                </div>
                <div className="w-full lg:w-96 min-h-0 overflow-y-auto p-4 lg:p-6">
                  {/* 包裹层无高度限制，使右侧列按内容高度出现滚动条，生成按钮可滚动到 */}
                  <div className="min-w-0">
                    <ImageGenerator
                      userId={user?.id}
                      remaining={user?.remaining ?? 0}
                      isLoggedIn={!!user}
                      allowAnonymous={false}
                      onLoginRequest={handleWechatLogin}
                      imageUrl={imageUrl}
                      onImageGenerated={(url) => {
                        setImageUrl(url || null)
                        setImageLoading(false)
                      }}
                    onLoadingChange={setImageLoading}
                    providersApiUrl="/api/providers/advanced"
                    />
                  </div>
                </div>
              </>
            )}

            {modality === 'video' && (
              <ModalityPlaceholder
                title="视频生成"
                inputLabel="描述或脚本"
                outputLabel="视频输出"
                models={trialModels.video}
                comingSoon
              />
            )}

            {modality === 'audio' && (
              <ModalityPlaceholder
                title="音频生成"
                inputLabel="文本或描述"
                outputLabel="音频输出"
                models={trialModels.audio}
                comingSoon
              />
            )}

            {modality === 'music' && (
              <ModalityPlaceholder
                title="音乐生成"
                inputLabel="风格或描述"
                outputLabel="音乐输出"
                models={trialModels.music}
                comingSoon
              />
            )}

            {modality === 'text' && (
              <ModalityPlaceholder
                title="文本生成"
                inputLabel="提示词"
                outputLabel="生成内容"
                models={trialModels.text}
                comingSoon
              />
            )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function ModalityPlaceholder({
  title,
  inputLabel,
  outputLabel,
  models,
  comingSoon,
}: {
  title: string
  inputLabel: string
  outputLabel: string
  models: string[]
  comingSoon?: boolean
}) {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  return (
    <>
      <div className="flex-1 min-h-0 border-b lg:border-b-0 lg:border-r border-gray-200 min-h-[200px] lg:min-h-0 p-4 flex flex-col overflow-hidden">
        <p className="text-sm font-medium text-gray-500 mb-2">{outputLabel}</p>
        <div className="flex-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 text-sm min-h-0">
          {comingSoon ? '该模态即将开放' : '输出将显示在此处'}
        </div>
      </div>
      <div className="w-full lg:w-96 min-h-0 flex flex-col overflow-y-auto p-4 lg:p-6">
        <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
        {models.length > 0 ? (
          <>
            <label className="block text-xs text-gray-500 mb-1">选择模型</label>
            <select
              value={selectedModel || (models[0] ?? '')}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3 bg-white"
              disabled={comingSoon}
            >
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </>
        ) : (
          <p className="text-xs text-gray-400 mb-2">暂无配置模型（可在 TRIAL_MODELS_* 中配置）</p>
        )}
        <label className="block text-xs text-gray-500 mb-1">{inputLabel}</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`输入${inputLabel}...`}
          className="w-full h-24 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
          disabled={comingSoon}
        />
        <button
          type="button"
          disabled={comingSoon}
          className="mt-3 w-full py-2 rounded-lg bg-gray-200 text-gray-500 text-sm font-medium cursor-not-allowed"
        >
          {comingSoon ? '即将开放' : '生成'}
        </button>
      </div>
    </>
  )
}
