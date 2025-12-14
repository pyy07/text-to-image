'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

interface NavigationProps {
  user?: {
    nickname?: string
    avatar?: string
  }
  onLogout?: () => void
}

export default function Navigation({ user, onLogout }: NavigationProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/gallery', label: '案例' },
    { href: '/assets', label: '我的素材' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center flex-1 min-w-0">
            <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                IMG
              </div>
              <Link href="/" className="text-base sm:text-xl font-bold text-gray-900 truncate">
                Text-to-Image
              </Link>
            </div>
            <div className="hidden sm:ml-6 lg:ml-8 sm:flex sm:space-x-4 lg:space-x-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === '/' && pathname === '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {user ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-[100px] lg:max-w-none">{user.nickname || '用户'}</span>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 px-2 py-1 sm:px-0 sm:py-0"
                  >
                    退出
                  </button>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm whitespace-nowrap"
              >
                登录
              </Link>
            )}
            <div className="hidden sm:block">
              <Image
                src="/logo.png"
                alt="Logo"
                width={160}
                height={80}
                className="h-16 w-auto object-contain"
                priority
              />
            </div>
          </div>
        </div>
        {/* 移动端导航菜单 */}
        <div className="sm:hidden border-t border-gray-200 py-2">
          <div className="flex space-x-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/' && pathname === '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

