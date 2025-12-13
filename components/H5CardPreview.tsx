'use client'

import { useEffect, useMemo } from 'react'

function wrapHtmlForPreview(raw: string) {
  const html = (raw || '').trim()
  if (!html) return ''

  const baseMeta = '<meta name="viewport" content="width=device-width,initial-scale=1" />'
  const baseStyle =
    '<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent;}*{box-sizing:border-box;}</style>'

  // 如果不是完整 HTML 文档，则包一层，确保能在 iframe 中“铺满”
  const looksLikeDoc = /<!doctype\s+html/i.test(html) || /<html[\s>]/i.test(html)
  if (!looksLikeDoc) {
    return `<!doctype html><html><head>${baseMeta}${baseStyle}</head><body>${html}</body></html>`
  }

  // 尽量注入 viewport + 基础样式到 <head> 内（若找不到就直接拼到最前面）
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}${baseMeta}${baseStyle}`)
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html(\s[^>]*)?>/i, (m) => `${m}<head>${baseMeta}${baseStyle}</head>`)
  }

  return `${baseMeta}${baseStyle}${html}`
}

export default function H5CardPreview({ html }: { html: string }) {
  const blobUrl = useMemo(() => {
    if (!html) return null
    const wrapped = wrapHtmlForPreview(html)
    const blob = new Blob([wrapped], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }, [html])

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  if (!blobUrl) return null

  return (
    <div className="relative w-full h-full overflow-hidden rounded-md bg-white/90 border border-gray-200">
      <iframe
        src={blobUrl}
        className="absolute inset-0 w-full h-full border-0 pointer-events-none"
        sandbox="allow-scripts allow-same-origin"
        title="H5 动画预览"
        tabIndex={-1}
      />
    </div>
  )
}


