import { NextResponse } from 'next/server'
import { isComicEnabled } from '@/lib/config/comic'

/**
 * GET /api/features - 返回功能开关（用于前端隐藏/展示文生漫等）
 */
export async function GET() {
  return NextResponse.json({
    comicEnabled: isComicEnabled(),
  })
}
