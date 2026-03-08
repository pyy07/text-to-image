/**
 * 全局功能开关
 * ALLOW_DELETE：案例列表（图片+漫画）是否允许删除，默认 false
 * ALLOW_ANONYMOUS：是否允许未登录用户使用文生图等，默认 false（开发环境可为 true）
 */

export function isAllowDelete(): boolean {
  return process.env.ALLOW_DELETE === 'true' || process.env.ALLOW_DELETE === '1'
}

export function isAllowAnonymous(): boolean {
  return (
    process.env.ALLOW_ANONYMOUS === 'true' ||
    process.env.ALLOW_ANONYMOUS === '1' ||
    (process.env.NODE_ENV === 'development' && process.env.ALLOW_ANONYMOUS !== 'false')
  )
}
