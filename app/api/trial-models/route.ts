import { NextResponse } from 'next/server'
import { getAllTrialModels } from '@/lib/config/trial-models'

/**
 * GET /api/trial-models
 * 返回各模态下可试用的模型列表（按配置 TRIAL_MODELS_*）
 */
export async function GET() {
  const models = getAllTrialModels()
  return NextResponse.json(models)
}
