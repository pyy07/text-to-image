import { NextRequest } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * 检查当前请求是否允许使用先进模型：管理员（env 或 DB isAdmin）或用户表 isVip 为 true（在后台用户管理设置）。
 * @param request 请求对象
 * @param userIdFromBody 若在 POST 中已解析 body，可传入 userId，避免重复读 body
 */
export async function canUseAdvancedModels(
  request: NextRequest,
  userIdFromBody?: string
): Promise<boolean> {
  const admin = await getAdminFromRequest(request)
  if (admin) return true

  const userId =
    userIdFromBody ||
    request.headers.get('x-user-id')?.trim()
  if (!userId || typeof userId !== 'string') return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, isVip: true },
  })
  return user?.isAdmin === true || user?.isVip === true
}
