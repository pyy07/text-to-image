import { NextResponse } from 'next/server'
import { getConfiguredProviders, getAdvancedModels } from '@/lib/ai/config'

/**
 * GET /api/providers/advanced
 * 返回先进模型列表，所有用户可见；实际生成时再校验权限并提示。
 */
export async function GET() {
  const providers = getConfiguredProviders()
  const openaiAdvanced = getAdvancedModels('openai')
  if (openaiAdvanced.length === 0 || !providers.includes('openai')) {
    return NextResponse.json({
      providers: [],
      defaultProvider: 'openai',
    })
  }

  return NextResponse.json({
    providers: [
      {
        name: 'openai',
        configured: true,
        models: openaiAdvanced,
      },
    ],
    defaultProvider: 'openai',
  })
}
