import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { cancelDelivery } from '@/lib/inventory-engine'
import { emitDeliveryUpdated } from '@/lib/socket-server'

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

    const result = await cancelDelivery(id, auth.session!.userId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, code: result.code },
        { status: 400 }
      )
    }

    const delivery = await prisma.deliveryOrder.findUnique({ where: { id } })
    if (delivery) {
      emitDeliveryUpdated({
        deliveryId: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        status: 'CANCELED',
      })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Cancel delivery error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}