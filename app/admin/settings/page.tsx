'use client'

import { useEffect, useState } from 'react'

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}

const PRESET_KEYS = [
  'site_name',
  'default_max_usage',
  'maintenance_message',
]

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const fetchSettings = async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '获取失败')
      setSettings(data.settings ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取设置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const save = async (updates: Record<string, string>) => {
    const token = getAdminToken()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: updates }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失败')
      setSettings(data.settings ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handlePresetChange = (key: string, value: string) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    save(next)
  }

  const handleAdd = () => {
    const k = newKey.trim()
    if (!k) return
    const next = { ...settings, [k]: newValue }
    setSettings(next)
    setNewKey('')
    setNewValue('')
    save(next)
  }

  const handleDelete = (key: string) => {
    const next = { ...settings }
    delete next[key]
    setSettings(next)
    save(next)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">网站设置</h1>
      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {saving && (
        <p className="mt-2 text-sm text-slate-500">保存中...</p>
      )}

      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">常用项</h2>
          <div className="space-y-3">
            {PRESET_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-3">
                <label className="w-40 shrink-0 text-sm text-slate-600">{key}</label>
                <input
                  type="text"
                  value={settings[key] ?? ''}
                  onChange={(e) => handlePresetChange(key, e.target.value)}
                  className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder={`${key} 的值`}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">全部键值</h2>
          <div className="space-y-2">
            {Object.entries(settings).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-48 truncate text-sm text-slate-700">{k}</span>
                <input
                  type="text"
                  value={v}
                  onChange={(e) => {
                    const next = { ...settings, [k]: e.target.value }
                    setSettings(next)
                    save(next)
                  }}
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(k)}
                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="键名"
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="值"
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              添加
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
