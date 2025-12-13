'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  nickname?: string
  wechatOpenId: string
  usageCount: number
  maxUsage: number
  isPermanent: boolean
  createdAt: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: 实现获取用户列表的 API
    // fetchUsers()
    setLoading(false)
  }, [])

  const handleSetPermanent = async (userId: string, isPermanent: boolean) => {
    // TODO: 实现设置永久用户的 API
    console.log('设置永久用户:', userId, isPermanent)
  }

  const handleResetUsage = async (userId: string) => {
    // TODO: 实现重置使用次数的 API
    console.log('重置使用次数:', userId)
  }

  const handleIncreaseUsage = async (userId: string, amount: number) => {
    // TODO: 实现增加使用次数的 API
    console.log('增加使用次数:', userId, amount)
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">用户管理</h1>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">暂无用户</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">昵称</th>
                  <th className="border p-2 text-left">使用次数</th>
                  <th className="border p-2 text-left">最大次数</th>
                  <th className="border p-2 text-left">永久用户</th>
                  <th className="border p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="border p-2">{user.nickname || '未设置'}</td>
                    <td className="border p-2">{user.usageCount}</td>
                    <td className="border p-2">{user.maxUsage}</td>
                    <td className="border p-2">
                      {user.isPermanent ? '是' : '否'}
                    </td>
                    <td className="border p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleSetPermanent(user.id, !user.isPermanent)
                          }
                          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                          {user.isPermanent ? '取消永久' : '设为永久'}
                        </button>
                        <button
                          onClick={() => handleResetUsage(user.id)}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          重置次数
                        </button>
                        <button
                          onClick={() => handleIncreaseUsage(user.id, 3)}
                          className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
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
    </main>
  )
}

