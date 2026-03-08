'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboardPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/users')
  }, [router])
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-blue-600" />
    </div>
  )
}
