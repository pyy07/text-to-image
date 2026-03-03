/**
 * 全局功能开关
 * ALLOW_DELETE：案例列表（图片+漫画）是否允许删除，默认 false
 */

export function isAllowDelete(): boolean {
  return process.env.ALLOW_DELETE === 'true' || process.env.ALLOW_DELETE === '1'
}
