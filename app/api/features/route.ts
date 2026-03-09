import { NextResponse } from 'next/server'
import { isComicEnabled } from '@/lib/config/comic'
import { isAnimationEnabled } from '@/lib/config/animation'
import { isAllowDelete, isAllowAnonymous } from '@/lib/config/features'

/**
 * GET /api/features - 返回功能开关（用于前端隐藏/展示文生漫、文生动画、案例删除、匿名使用等）
 */
export async function GET() {
  return NextResponse.json({
    comicEnabled: isComicEnabled(),
    animationEnabled: isAnimationEnabled(),
    allowDelete: isAllowDelete(),
    allowAnonymous: isAllowAnonymous(),
  })
}
