import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  wechatOpenId?: string | null
  username?: string | null
  password?: string | null // 密码字段，用于登录验证
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

export async function getUserByUsername(
  username: string
): Promise<User | null> {
  // 使用原生 SQL 查询，因为迁移可能还未应用
  // 这样可以避免 Prisma 类型错误
  try {
    const users = await prisma.$queryRaw<Array<{
      id: string
      wechatOpenId: string | null
      username: string | null
      password: string | null
      nickname: string | null
      avatar: string | null
      usageCount: number
      maxUsage: number
      isPermanent: boolean
      createdAt: Date
      updatedAt: Date
    }>>`
      SELECT * FROM users WHERE username = ${username} LIMIT 1
    `
    
    if (users.length === 0) {
      return null
    }
    
    const user = users[0]
    return {
      id: user.id,
      wechatOpenId: user.wechatOpenId,
      username: user.username,
      password: user.password, // 包含密码字段，用于登录验证
      nickname: user.nickname,
      avatar: user.avatar,
      usageCount: user.usageCount,
      maxUsage: user.maxUsage,
      isPermanent: user.isPermanent,
    }
  } catch (error: any) {
    // 如果 username 字段不存在（迁移未应用），返回 null
    if (error.message?.includes('column "username" does not exist')) {
      return null
    }
    // 如果是数据库连接错误，也返回 null，避免阻塞
    if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
      console.error('数据库连接失败:', error.message)
      return null
    }
    throw error
  }
}

export async function createUser(openId?: string, nickname?: string, username?: string, password?: string) {
  const data: any = {
    nickname,
    usageCount: 0,
    maxUsage: 3,
    isPermanent: false,
  }
  
  if (openId) {
    data.wechatOpenId = openId
  }
  
  if (username) {
    data.username = username
  }
  
  if (password) {
    data.password = await bcrypt.hash(password, 10)
  }
  
  const user = await prisma.user.create({
    data,
  })
  return user
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
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

