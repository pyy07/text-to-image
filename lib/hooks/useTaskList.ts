import { useEffect, useState } from 'react'
import type { Task } from './useTaskPolling'

interface UseTaskListOptions {
  userId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useTaskList({ userId, autoRefresh = true, refreshInterval = 5000 }: UseTaskListOptions) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTasks = async () => {
    if (!userId) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'x-user-id': userId },
      })
      const data = await res.json()

      if (res.ok) {
        setTasks(data.tasks || [])
      } else {
        setError(data.error || '获取任务列表失败')
      }
    } catch (err: any) {
      setError(err.message || '获取任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()

    if (autoRefresh) {
      const interval = setInterval(fetchTasks, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [userId, autoRefresh, refreshInterval])

  const runningTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'processing'
  )

  return {
    tasks,
    runningTasks,
    loading,
    error,
    refresh: fetchTasks,
  }
}

