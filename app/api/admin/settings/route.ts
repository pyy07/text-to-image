import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getAdminFromRequest } from '@/lib/admin-auth'
import { createAuditLog } from '@/lib/audit-log'

export async function GET(request: NextRequest) {
  const unauth = await requireAdmin(request)
  if (unauth) return unauth

  try {
    const list = await prisma.siteSetting.findMany({
      orderBy: { key: 'asc' },
    })
    const settings: Record<string, string> = {}
    list.forEach((s) => {
      settings[s.key] = s.value
    })
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('获取网站设置错误:', error)
    return NextResponse.json(
      { error: '获取网站设置失败' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const unauth = await requireAdmin(request)
  if (unauth) return unauth

  try {
    const body = await request.json()
    const admin = await getAdminFromRequest(request)
    if (!admin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
    }

    const entries = body.settings as Record<string, string> | undefined
    if (!entries || typeof entries !== 'object') {
      return NextResponse.json(
        { error: '请提供 settings 对象，如 { "settings": { "key": "value" } }' },
        { status: 400 }
      )
    }

    for (const [key, value] of Object.entries(entries)) {
      if (typeof key !== 'string' || key.trim() === '') continue
      const val = value == null ? '' : String(value)
      await prisma.siteSetting.upsert({
        where: { key: key.trim() },
        create: { key: key.trim(), value: val },
        update: { value: val },
      })
    }

    await createAuditLog({
      actorId: admin.id === 'env-admin' ? undefined : admin.id,
      action: 'settings.update',
      targetType: 'settings',
      details: JSON.stringify(Object.keys(entries)),
    })

    const list = await prisma.siteSetting.findMany({
      orderBy: { key: 'asc' },
    })
    const settings: Record<string, string> = {}
    list.forEach((s) => {
      settings[s.key] = s.value
    })
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('更新网站设置错误:', error)
    return NextResponse.json(
      { error: '更新网站设置失败' },
      { status: 500 }
    )
  }
}
