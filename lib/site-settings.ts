import { prisma } from '@/lib/prisma'

/**
 * 按 key 读取网站设置（来自 site_settings 表，可在 /admin/settings 配置）
 */
export async function getSiteSetting(key: string): Promise<string | null> {
  const row = await prisma.siteSetting.findUnique({
    where: { key },
    select: { value: true },
  })
  return row?.value ?? null
}
