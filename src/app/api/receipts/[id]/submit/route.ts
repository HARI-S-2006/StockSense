import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params

    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (!receipt) {
      return NextResponse.json(
        { success: false, message: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (receipt.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Can only submit draft receipts', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    // Check if has items
    const itemsCount = await prisma.receiptItem.count({ where: { receiptId: id } })
    if (itemsCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Receipt must have at least one item', code: 'NO_ITEMS' },
        { status: 400 }
      )
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: { status: 'WAITING' },
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'SUBMIT_RECEIPT',
        entity: 'Receipt',
        entityId: id,
        before: { status: 'DRAFT' },
        after: { status: 'WAITING' },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Receipt submitted for review',
      data: updated,
    })
  } catch (error) {
    console.error('Submit receipt error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}