import { prisma } from './prisma'

export interface User {
  id: string
  wechatOpenId: string
  nickname?: string | null
  avatar?: string | null
  usageCount: number
  maxUsage: number
  isPermanent: boolean
}

export async function getUserByWechatOpenId(
  openId: string
): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { wechatOpenId: openId },
  })
  return user
}

export async function createUser(openId: string, nickname?: string) {
  const user = await prisma.user.create({
    data: {
      wechatOpenId: openId,
      nickname,
      usageCount: 0,
      maxUsage: 3,
      isPermanent: false,
    },
  })
  return user
}

export async function checkUserUsageLimit(userId: string): Promise<{
  allowed: boolean
  remaining: number
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return { allowed: false, remaining: 0 }
  }

  if (user.isPermanent) {
    return { allowed: true, remaining: -1 } // -1 表示无限制
  }

  const remaining = user.maxUsage - user.usageCount
  return {
    allowed: remaining > 0,
    remaining,
  }
}

export async function incrementUserUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || user.isPermanent) {
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      usageCount: {
        increment: 1,
      },
    },
  })
}

