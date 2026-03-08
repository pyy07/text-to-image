'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  nickname?: string | null
  wechatOpenId: string | null
  usageCount: number
  maxUsage: number
  isPermanent: boolean
  isVip: boolean
  createdAt: string
}

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const fetchUsers = async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '获取用户列表失败')
      setUsers(data.users ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const patchUser = async (payload: {
    userId: string
    isPermanent?: boolean
    isVip?: boolean
    resetUsage?: boolean
    increaseUsage?: number
  }) => {
    const token = getAdminToken()
    if (!token) return
    setActing(payload.userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '操作失败')
      await fetchUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setActing(null)
    }
  }

  const handleSetPermanent = (userId: string, isPermanent: boolean) => {
    patchUser({ userId, isPermanent })
  }

  const handleSetVip = (userId: string, isVip: boolean) => {
    patchUser({ userId, isVip })
  }

  const handleResetUsage = (userId: string) => {
    patchUser({ userId, resetUsage: true })
  }

  const handleIncreaseUsage = (userId: string, amount: number) => {
    patchUser({ userId, increaseUsage: amount })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">用户管理</h1>
      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {users.length === 0 ? (
        <p className="mt-6 text-slate-500">暂无用户</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-left font-medium text-slate-700">用户 ID</th>
                <th className="p-3 text-left font-medium text-slate-700">昵称</th>
                <th className="p-3 text-left font-medium text-slate-700">使用次数</th>
                <th className="p-3 text-left font-medium text-slate-700">最大次数</th>
                <th className="p-3 text-left font-medium text-slate-700">永久用户</th>
                <th className="p-3 text-left font-medium text-slate-700">VIP</th>
                <th className="p-3 text-left font-medium text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="p-3 text-slate-600 font-mono text-xs" title={user.id}>
                    {user.id.length > 12 ? `${user.id.slice(0, 8)}…` : user.id}
                  </td>
                  <td className="p-3 text-slate-800">{user.nickname || '未设置'}</td>
                  <td className="p-3 text-slate-800">{user.usageCount}</td>
                  <td className="p-3 text-slate-800">{user.maxUsage}</td>
                  <td className="p-3 text-slate-800">{user.isPermanent ? '是' : '否'}</td>
                  <td className="p-3 text-slate-800">{user.isVip ? '是' : '否'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPermanent(user.id, !user.isPermanent)}
                        disabled={acting === user.id}
                        className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {user.isPermanent ? '取消永久' : '设为永久'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetVip(user.id, !user.isVip)}
                        disabled={acting === user.id}
                        className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        {user.isVip ? '取消VIP' : '设为VIP'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetUsage(user.id)}
                        disabled={acting === user.id}
                        className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        重置次数
                      </button>
                      <button
                        type="button"
                        onClick={() => handleIncreaseUsage(user.id, 3)}
                        disabled={acting === user.id}
                        className="rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        +3次
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
