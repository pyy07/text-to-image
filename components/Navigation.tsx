'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo3D from '@/components/Logo3D'

interface NavigationProps {
  user?: {
    nickname?: string
    avatar?: string
  }
  onLogout?: () => void
}

export default function Navigation({ user: propUser, onLogout }: NavigationProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<{ nickname?: string; avatar?: string } | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Navigation 组件自己管理用户状态，使用缓存避免重复获取
  useEffect(() => {
    // 优先使用传入的 user（向后兼容）
    if (propUser) {
      setUser(propUser)
      setCheckingAuth(false)
      // 缓存用户信息
      if (propUser.nickname) {
        sessionStorage.setItem('nav_user', JSON.stringify(propUser))
      }
      return
    }

    // 同步检查 localStorage，避免闪烁
    const token = localStorage.getItem('auth_token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token))
        
        // 先尝试从 sessionStorage 获取缓存的用户信息
        const cachedUser = sessionStorage.getItem('nav_user')
        if (cachedUser) {
          try {
            const cached = JSON.parse(cachedUser)
            // 验证缓存的用户 ID 是否匹配
            const cachedUserId = sessionStorage.getItem('nav_user_id')
            if (cachedUserId === payload.userId) {
              setUser(cached)
              setCheckingAuth(false)
              return // 使用缓存，不需要重新获取
            }
          } catch (e) {
            // 缓存无效，继续获取
          }
        }
        
        // 如果没有缓存或缓存无效，获取用户信息
        setUser({ nickname: '...' })
        setCheckingAuth(true)
        fetch(`/api/user`, {
          headers: { 'x-user-id': payload.userId },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.id) {
              const userInfo = { nickname: data.nickname, avatar: data.avatar }
              setUser(userInfo)
              // 缓存用户信息
              sessionStorage.setItem('nav_user', JSON.stringify(userInfo))
              sessionStorage.setItem('nav_user_id', payload.userId)
            } else {
              setUser(null)
              sessionStorage.removeItem('nav_user')
              sessionStorage.removeItem('nav_user_id')
            }
          })
          .catch(() => {
            setUser(null)
            sessionStorage.removeItem('nav_user')
            sessionStorage.removeItem('nav_user_id')
          })
          .finally(() => {
            setCheckingAuth(false)
          })
      } catch (error) {
        setUser(null)
        setCheckingAuth(false)
        sessionStorage.removeItem('nav_user')
        sessionStorage.removeItem('nav_user_id')
      }
    } else {
      setUser(null)
      setCheckingAuth(false)
      sessionStorage.removeItem('nav_user')
      sessionStorage.removeItem('nav_user_id')
    }
  }, [propUser])

  // 监听 localStorage 变化（跨标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        // token 变化，重新检查
        const token = localStorage.getItem('auth_token')
        if (!token) {
          setUser(null)
          sessionStorage.removeItem('nav_user')
          sessionStorage.removeItem('nav_user_id')
        } else {
          // 重新获取用户信息
          try {
            const payload = JSON.parse(atob(token))
            fetch(`/api/user`, {
              headers: { 'x-user-id': payload.userId },
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.id) {
                  const userInfo = { nickname: data.nickname, avatar: data.avatar }
                  setUser(userInfo)
                  sessionStorage.setItem('nav_user', JSON.stringify(userInfo))
                  sessionStorage.setItem('nav_user_id', payload.userId)
                }
              })
              .catch(() => {
                setUser(null)
              })
          } catch (error) {
            setUser(null)
          }
        }
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // 处理退出登录
  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      // 如果没有传入 onLogout，使用默认的退出逻辑
      localStorage.removeItem('auth_token')
      sessionStorage.removeItem('nav_user')
      sessionStorage.removeItem('nav_user_id')
      window.location.href = '/'
    }
    setUser(null)
  }

  const navItems = [
    { href: '/', label: '首页' },
    { href: '/gallery', label: '案例' },
    { href: '/assets', label: '我的素材' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-2 sm:px-3 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* 左侧：Logo 和导航 */}
          <div className="flex items-center flex-shrink-0">
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
          
          {/* 右侧：登录按钮和 Logo，使用 flexbox 对齐到右侧边缘 */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* 登录/用户信息 */}
            {checkingAuth && user ? (
              <span className="hidden sm:inline text-sm text-gray-400 truncate max-w-[100px] lg:max-w-none">...</span>
            ) : user && !checkingAuth ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <span className="hidden sm:inline text-sm text-gray-700 font-medium truncate max-w-[100px] lg:max-w-none">{user.nickname || '用户'}</span>
                <button
                  onClick={handleLogout}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors whitespace-nowrap"
                >
                  退出
                </button>
              </div>
            ) : (
              <div className="relative group flex-shrink-0">
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs sm:text-sm whitespace-nowrap"
                >
                  登录
                </Link>
                {/* 悬停提示 - 显示在按钮下方 */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  登录后可以保存个人素材
                  {/* 小三角箭头 - 指向按钮 */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                </div>
              </div>
            )}
            {/* Logo3D - 在登录按钮右边，与登录按钮垂直居中对齐，向下偏移 2px */}
            <div className="hidden sm:block" style={{ width: '140px', height: '33px', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', transform: 'translateY(2.5px)' }}>
              <Logo3D />
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

