import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true, unitOfMeasure: true, reorderLevel: true } },
        location: { include: { warehouse: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        appliedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    })

    if (!adjustment) {
      return NextResponse.json(
        { success: false, message: 'Adjustment not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: adjustment })
  } catch (error) {
    console.error('Get adjustment error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}