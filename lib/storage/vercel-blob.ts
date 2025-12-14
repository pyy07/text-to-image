import { put } from '@vercel/blob'
import crypto from 'crypto'

function extFromMime(mimeType: string) {
  const mt = (mimeType || '').toLowerCase()
  if (mt.includes('png')) return 'png'
  if (mt.includes('jpeg') || mt.includes('jpg')) return 'jpg'
  if (mt.includes('webp')) return 'webp'
  return 'png'
}

export async function uploadImageUrlToVercelBlob(args: {
  sourceUrl: string
  mimeType: string
  prefix?: string
}): Promise<{ url: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error('未配置 Vercel Blob：请设置 BLOB_READ_WRITE_TOKEN')
  }

  const res = await fetch(args.sourceUrl)
  if (!res.ok) {
    throw new Error(`下载生成图片失败（${res.status}）`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const ext = extFromMime(args.mimeType)
  const prefix = (args.prefix || 'generated').replace(/^\/+|\/+$/g, '')
  const filename = `${prefix}/${crypto.randomUUID()}.${ext}`

  const uploaded = await put(filename, buffer, {
    access: 'public',
    contentType: args.mimeType,
    token,
    addRandomSuffix: false,
  })

  return { url: uploaded.url }
}

export async function uploadImageBufferToVercelBlob(args: {
  buffer: Buffer
  mimeType: string
  prefix?: string
  ext?: string
}): Promise<{ url: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    throw new Error('未配置 Vercel Blob：请设置 BLOB_READ_WRITE_TOKEN')
  }

  const ext = (args.ext || extFromMime(args.mimeType)).replace(/^\./, '')
  const prefix = (args.prefix || 'uploads').replace(/^\/+|\/+$/g, '')
  const filename = `${prefix}/${crypto.randomUUID()}.${ext}`

  const uploaded = await put(filename, args.buffer, {
    access: 'public',
    contentType: args.mimeType,
    token,
    addRandomSuffix: false,
  })

  return { url: uploaded.url }
}


