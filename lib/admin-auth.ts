import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface AdminUser {
  id: string
  username: string | null
  nickname: string | null
  isAdmin: true
}

/**
 * 从请求中解析 token（Authorization: Bearer <token> 或 body/header 中的 token），
 * 校验用户存在且 isAdmin 为 true。
 */
export async function getAdminFromRequest(
  request: NextRequest
): Promise<AdminUser | null> {
  let token: string | null =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    null
  if (!token) {
    const authHeader = request.headers.get('x-auth-token')
    if (authHeader) token = authHeader
  }

  if (!token) return null

  let payload: { userId?: string; admin?: boolean; username?: string }
  try {
    payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8'))
  } catch {
    return null
  }

  // 环境变量配置的管理员：token 内带 admin: true
  if (payload.admin === true && payload.username) {
    const envUser = process.env.ADMIN_USERNAME?.trim()
    const envPass = process.env.ADMIN_PASSWORD
    if (envUser && envPass && payload.username === envUser) {
      return {
        id: 'env-admin',
        username: payload.username,
        nickname: payload.username,
        isAdmin: true,
      }
    }
  }

  const userId = payload.userId
  if (!userId || typeof userId !== 'string') return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, nickname: true, isAdmin: true },
  })

  if (!user || !user.isAdmin) return null
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    isAdmin: true,
  }
}

/**
 * 在 API 路由中使用：若当前请求不是管理员则返回 401 JSON，否则返回 null（继续执行）。
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const admin = await getAdminFromRequest(request)
  if (!admin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }
  return null
}
