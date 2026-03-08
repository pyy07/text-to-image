import { useEffect, useRef, useState } from 'react'

export interface Task {
  taskId: string
  type: 'edit' | 'compose'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
  description: string
  inputImageUrls: string[]
  resultImageUrl?: string
  resultAssetId?: string
  error?: string
  createdAt: string
  updatedAt: string
  expiresAt: string
}

interface UseTaskPollingOptions {
  taskId: string | null
  userId?: string
  onCompleted?: (task: Task) => void
  onFailed?: (task: Task) => void
  pollInterval?: number
}

export function useTaskPolling({
  taskId,
  userId,
  onCompleted,
  onFailed,
  pollInterval = 2000, // 2 秒轮询一次
}: UseTaskPollingOptions) {
  const [task, setTask] = useState<Task | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const pollTask = async () => {
    if (!taskId) return

    const headers: Record<string, string> = {}
    if (userId) headers['x-user-id'] = userId
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('admin_token')
      if (t) headers['Authorization'] = `Bearer ${t}`
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { headers })
      const data = await res.json()

      if (res.ok) {
        setTask(data)
        
        if (data.status === 'completed') {
          setIsPolling(false)
          onCompleted?.(data)
        } else if (data.status === 'failed' || data.status === 'expired') {
          setIsPolling(false)
          onFailed?.(data)
        } else {
          // 触发任务处理（如果还在 pending）
          if (data.status === 'pending') {
            try {
              await fetch('/api/tasks/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId }),
              })
            } catch (error) {
              console.error('触发任务处理失败:', error)
            }
          }
        }
      }
    } catch (error) {
      console.error('轮询任务失败:', error)
    }
  }

  useEffect(() => {
    if (!taskId) {
      setIsPolling(false)
      setTask(null)
      return
    }

    setIsPolling(true)
    pollTask() // 立即查询一次

    intervalRef.current = setInterval(pollTask, pollInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [taskId, pollInterval])

  return { task, isPolling }
}

