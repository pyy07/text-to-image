'use client'

import { useTaskList } from '@/lib/hooks/useTaskList'

interface TaskListProps {
  userId?: string
}

export default function TaskList({ userId }: TaskListProps) {
  const { runningTasks, loading } = useTaskList({ userId, autoRefresh: true })

  if (!userId || runningTasks.length === 0) {
    return null
  }

  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-800">
          运行中的任务 ({runningTasks.length})
        </span>
      </div>
      <div className="space-y-2">
        {runningTasks.map((task) => (
          <div
            key={task.taskId}
            className="flex items-center gap-2 text-xs text-blue-700"
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="flex-1 truncate">
              {task.type === 'edit' ? '修改图片' : '合成图片'}: {task.description.slice(0, 30)}
              {task.description.length > 30 ? '...' : ''}
            </span>
            <span className="text-blue-600">
              {task.status === 'pending' ? '等待中' : '处理中'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

