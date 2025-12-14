import { NextRequest, NextResponse } from 'next/server'
import { uploadImageBufferToVercelBlob } from '@/lib/storage/vercel-blob'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '请上传图片文件（字段名：file）' }, { status: 400 })
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: '仅支持 PNG/JPEG/WEBP 图片' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: '图片过大（最大 10MB）' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadImageBufferToVercelBlob({
      buffer: buf,
      mimeType: file.type,
      prefix: 'inputs',
    })

    return NextResponse.json({ success: true, inputImageUrl: url, mimeType: file.type })
  } catch (error: any) {
    console.error('上传输入图失败:', error)
    return NextResponse.json({ error: '上传失败，请稍后重试' }, { status: 500 })
  }
}


