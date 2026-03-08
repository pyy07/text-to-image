/**
 * 模型试用：按模态配置可试用的模型列表（可与 UniAPI 等平台对应）
 * 环境变量：TRIAL_MODELS_IMAGE, TRIAL_MODELS_VIDEO, TRIAL_MODELS_AUDIO, TRIAL_MODELS_TEXT, TRIAL_MODELS_MUSIC（逗号分隔）
 */

export type TrialModality = 'image' | 'video' | 'audio' | 'text' | 'music'

const ENV_KEYS: Record<TrialModality, string> = {
  image: 'TRIAL_MODELS_IMAGE',
  video: 'TRIAL_MODELS_VIDEO',
  audio: 'TRIAL_MODELS_AUDIO',
  text: 'TRIAL_MODELS_TEXT',
  music: 'TRIAL_MODELS_MUSIC',
}

function parseList(envValue: string | undefined): string[] {
  if (!envValue || typeof envValue !== 'string') return []
  return envValue.split(',').map((m) => m.trim()).filter(Boolean)
}

export function getTrialModels(modality: TrialModality): string[] {
  const key = ENV_KEYS[modality]
  const value = process.env[key]
  return parseList(value)
}

export function getAllTrialModels(): Record<TrialModality, string[]> {
  return {
    image: getTrialModels('image'),
    video: getTrialModels('video'),
    audio: getTrialModels('audio'),
    text: getTrialModels('text'),
    music: getTrialModels('music'),
  }
}
