'use client'

import { useEffect, useState } from 'react'

interface LogEntry {
  id: string
  action: string
  targetType: string | null
  targetId: string | null
  details: string | null
  createdAt: string
  actor?: { id: string; nickname: string | null; username: string | null } | null
  user?: { id: string; nickname: string | null; username: string | null } | null
}

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}

export default function AdminOperationsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 30

  const fetchLogs = async (resetOffset = false) => {
    const token = getAdminToken()
    if (!token) return
    const off = resetOffset ? 0 : offset
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(off) })
      if (actionFilter.trim()) params.set('action', actionFilter.trim())
      const res = await fetch(`/api/admin/operations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '获取失败')
      setLogs(data.operations ?? [])
      setTotal(data.total ?? 0)
      if (resetOffset) setOffset(0)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(true)
  }, [actionFilter])

  const loadMore = () => {
    setOffset((o) => o + limit)
  }

  useEffect(() => {
    if (offset <= 0) return
    const token = getAdminToken()
    if (!token) return
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (actionFilter.trim()) params.set('action', actionFilter.trim())
    fetch(`/api/admin/operations?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setLogs((prev) => [...prev, ...(data.operations ?? [])])
      })
  }, [offset, actionFilter])

  const formatTime = (s: string) => {
    try {
      const d = new Date(s)
      return d.toLocaleString('zh-CN')
    } catch {
      return s
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">操作管理</h1>
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          placeholder="按 action 筛选，如 user.update"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => fetchLogs(true)}
          className="rounded bg-slate-200 px-3 py-2 text-sm hover:bg-slate-300"
        >
          查询
        </button>
      </div>
      {loading && logs.length === 0 ? (
        <div className="mt-6 flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600" />
        </div>
      ) : logs.length === 0 ? (
        <p className="mt-6 text-slate-500">暂无操作记录</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-left font-medium text-slate-700">时间</th>
                <th className="p-3 text-left font-medium text-slate-700">操作</th>
                <th className="p-3 text-left font-medium text-slate-700">目标类型</th>
                <th className="p-3 text-left font-medium text-slate-700">目标 ID</th>
                <th className="p-3 text-left font-medium text-slate-700">操作人</th>
                <th className="p-3 text-left font-medium text-slate-700">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap p-3 text-slate-600">
                    {formatTime(log.createdAt)}
                  </td>
                  <td className="p-3 font-medium text-slate-800">{log.action}</td>
                  <td className="p-3 text-slate-600">{log.targetType ?? '-'}</td>
                  <td className="max-w-[120px] truncate p-3 text-slate-600">
                    {log.targetId ?? '-'}
                  </td>
                  <td className="p-3 text-slate-600">
                    {log.actor
                      ? log.actor.nickname || log.actor.username || log.actor.id
                      : '-'}
                  </td>
                  <td className="max-w-[200px] truncate p-3 text-slate-600">
                    {log.details ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length < total && (
            <div className="border-t border-slate-200 p-3 text-center">
              <button
                type="button"
                onClick={loadMore}
                className="text-sm text-blue-600 hover:underline"
              >
                加载更多（{logs.length} / {total}）
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
