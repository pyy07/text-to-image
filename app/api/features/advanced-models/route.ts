import { NextRequest, NextResponse } from 'next/server'
import { canUseAdvancedModels } from '@/lib/advanced-models-auth'
import { getAdvancedModels } from '@/lib/ai/config'

/**
 * GET /api/features/advanced-models
 * 返回当前请求者是否可使用先进模型。需带 x-user-id（普通用户）或 Authorization: Bearer <admin_token>
 */
export async function GET(request: NextRequest) {
  const allowed = await canUseAdvancedModels(request)
  const hasAdvancedModels = getAdvancedModels('openai').length > 0
  return NextResponse.json({
    allowed: allowed && hasAdvancedModels,
  })
}
