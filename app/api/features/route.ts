import { NextResponse } from 'next/server'
import { isComicEnabled } from '@/lib/config/comic'
import { isAllowDelete, isAllowAnonymous } from '@/lib/config/features'

/**
 * GET /api/features - 返回功能开关（用于前端隐藏/展示文生漫、案例删除、匿名使用等）
 */
export async function GET() {
  return NextResponse.json({
    comicEnabled: isComicEnabled(),
    allowDelete: isAllowDelete(),
    allowAnonymous: isAllowAnonymous(),
  })
}
