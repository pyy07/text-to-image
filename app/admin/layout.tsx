'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const ADMIN_NAV = [
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/operations', label: '操作管理' },
  { href: '/admin/settings', label: '网站设置' },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [allowed, setAllowed] = useState<boolean | null>(null)

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) {
      setAllowed(true)
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
    if (!token) {
      router.replace('/admin/login')
      return
    }

    fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          setAllowed(true)
        } else {
          localStorage.removeItem('admin_token')
          router.replace('/admin/login')
        }
      })
      .catch(() => {
        router.replace('/admin/login')
      })
  }, [isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (allowed !== true) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-blue-600 mx-auto" />
          <p className="mt-3 text-slate-600">验证登录中...</p>
        </div>
      </main>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-52 shrink-0 border-r border-slate-200 bg-white">
        <div className="sticky top-0 flex flex-col p-4">
          <Link href="/admin" className="mb-4 font-semibold text-slate-800">
            后台管理
          </Link>
          <nav className="flex flex-col gap-1">
            {ADMIN_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-2 text-sm ${
                  pathname === href
                    ? 'bg-blue-100 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto border-t border-slate-200 pt-4">
            <Link
              href="/"
              className="block rounded px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
            >
              返回首页
            </Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('admin_token')
                router.replace('/admin/login')
              }}
              className="mt-1 w-full rounded px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
            >
              退出登录
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
