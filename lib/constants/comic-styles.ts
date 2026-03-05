/**
 * 文生漫风格预设与风格描述生成
 * 供前端展示选项、后端拼入 prompt 使用
 */

export interface ComicStylePreset {
  id: string
  label: string
  description: string
  /** 注入到 # GLOBAL STYLE 的风格描述（不含「风格：」前缀，可多行） */
  promptSnippet: string
}

/** 预设风格列表：id 需与后端校验一致 */
export const COMIC_STYLE_PRESETS: ComicStylePreset[] = [
  {
    id: 'default',
    label: '默认',
    description: '现代数字漫画风，线条干净、色彩鲜明，简约易读',
    promptSnippet:
      '现代数字漫画风，高对比、线条干净，色彩鲜明但偏专业，简约易读。',
  },
  {
    id: 'manga',
    label: '日式动漫',
    description: '日式动漫风格，大眼、线条清晰、表情夸张',
    promptSnippet:
      '日式动漫风格：大眼、线条清晰、表情夸张；可带屏幕线或速度线；配色偏动画感。',
  },
  {
    id: 'retro',
    label: '复古美漫',
    description: '复古美式漫画，粗线条、网点、强烈对比',
    promptSnippet:
      '复古美式漫画：粗黑线框、网点阴影、强烈明暗对比，偏怀旧印刷感。',
  },
  {
    id: 'minimal',
    label: '极简',
    description: '极简线条、少量配色、留白多',
    promptSnippet:
      '极简风格：线条简洁、配色克制（2～3 色）、留白多，偏扁平插画。',
  },
  {
    id: 'professional',
    label: '商务信息图',
    description: '偏商务/图表感，配色克制，信息密度高',
    promptSnippet:
      '商务信息图风格：配色克制、版式规整、信息密度高，偏图表与简报感，易读专业。',
  },
  {
    id: 'sketch',
    label: '黑白素描',
    description: '简洁的黑白线条，素描质感',
    promptSnippet:
      '黑白素描风格：仅用黑色线条与排线/交叉线表现明暗，无彩色，简洁有力，带手绘素描质感。',
  },
  {
    id: 'children',
    label: '儿童卡通',
    description: '可爱圆润，色彩鲜艳，适合儿童',
    promptSnippet:
      '儿童卡通风格：造型圆润可爱、色彩鲜艳明快、线条柔和，适合儿童阅读，活泼友好。',
  },
  {
    id: 'watercolor',
    label: '水彩画',
    description: '柔和的色彩晕染，艺术感强',
    promptSnippet:
      '水彩画风格：柔和色彩晕染、边缘可略带洇染与渐变，通透感强，偏手绘艺术感。',
  },
  {
    id: 'inkwash',
    label: '水墨画',
    description: '中国传统水墨画，意境深远',
    promptSnippet:
      '中国传统水墨画风格：以墨色浓淡、笔触干湿表现层次，可留白造境，意境深远，偏写意。',
  },
  {
    id: 'american',
    label: '美漫',
    description: '美国超级英雄漫画，粗犷有力',
    promptSnippet:
      '美式超级英雄漫画风格：粗犷有力的线条、强烈明暗与块面、动感构图，配色饱满有冲击力。',
  },
  {
    id: 'cyberpunk',
    label: '赛博朋克',
    description: '霓虹、科技感、未来都市',
    promptSnippet:
      '赛博朋克风格：霓虹色、高对比、科技感与故障艺术元素，偏未来都市、科幻氛围。',
  },
  {
    id: 'doodle',
    label: '手绘涂鸦',
    description: '随性笔触，涂鸦感，轻松幽默',
    promptSnippet:
      '手绘涂鸦风格：线条随性、略带歪斜与手绘感，可配合简单填色，轻松幽默、像随手涂鸦。',
  },
  {
    id: 'custom',
    label: '自定义',
    description: '不选预设，直接写风格提示词',
    promptSnippet: '', // 选「自定义」时以用户输入的 styleCustom 为准，空则回退到默认
  },
]

const PRESET_MAP = new Map(COMIC_STYLE_PRESETS.map((p) => [p.id, p]))

/**
 * 根据预设 id 与可选的自定义描述，生成注入 prompt 的「# GLOBAL STYLE」中的风格段落。
 * - 选「自定义」且写了内容：仅用用户输入作为风格描述。
 * - 选「自定义」且未写：回退到内置默认风格。
 * - 选其他预设且写了补充：预设 snippet + 用户补充。
 * - 选其他预设且未写：仅用预设 snippet。
 */
export function getStyleDescription(
  stylePreset?: string | null,
  styleCustom?: string | null
): string {
  const custom = (styleCustom ?? '').trim()
  const preset = stylePreset ?? 'default'
  const builtinDefault = PRESET_MAP.get('default')!.promptSnippet

  if (preset === 'custom') {
    if (custom.length > 0) {
      const maxCustom = 500
      return custom.length > maxCustom ? custom.slice(0, maxCustom) + '...' : custom
    }
    return builtinDefault
  }

  const presetSnippet = PRESET_MAP.get(preset)?.promptSnippet ?? builtinDefault
  if (custom.length > 0) {
    const maxCustom = 500
    const truncated = custom.length > maxCustom ? custom.slice(0, maxCustom) + '...' : custom
    return `${presetSnippet}\n- 用户补充要求：${truncated}`
  }
  return presetSnippet
}
