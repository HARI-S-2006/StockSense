import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { cancelReceipt } from '@/lib/inventory-engine'
import { emitReceiptUpdated } from '@/lib/socket-server'

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

    const result = await cancelReceipt(id, auth.session!.userId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, code: result.code },
        { status: 400 }
      )
    }

    const receipt = await prisma.receipt.findUnique({ where: { id } })
    if (receipt) {
      emitReceiptUpdated({
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        status: 'CANCELED',
      })
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    console.error('Cancel receipt error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}