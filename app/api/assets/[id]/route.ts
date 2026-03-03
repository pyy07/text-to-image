import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAllowDelete } from '@/lib/config/features'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    })

    if (!asset) {
      return NextResponse.json(
        { error: '素材不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ asset })
  } catch (error) {
    console.error('获取素材详情错误:', error)
    return NextResponse.json(
      { error: '获取素材详情失败' },
      { status: 500 }
    )
  }
}

/**
 * 删除图片案例（仅当 ALLOW_DELETE=true 时允许）
 * DELETE /api/assets/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAllowDelete()) {
      return NextResponse.json(
        { error: '当前未开启案例删除功能' },
        { status: 403 }
      )
    }
    const assetId = params.id
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    })
    if (!asset) {
      return NextResponse.json({ error: '素材不存在' }, { status: 404 })
    }
    await prisma.asset.delete({ where: { id: assetId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('删除图片案例失败:', error)
    return NextResponse.json(
      { error: '删除失败，请稍后重试' },
      { status: 500 }
    )
  }
}

