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

    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        warehouse: true,
        location: true,
        createdBy: { select: { id: true, name: true, email: true } },
        validatedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
        },
      },
    })

    if (!delivery) {
      return NextResponse.json(
        { success: false, message: 'Delivery not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: delivery })
  } catch (error) {
    console.error('Get delivery error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params
    const body = await request.json()

    const delivery = await prisma.deliveryOrder.findUnique({ where: { id } })
    if (!delivery) {
      return NextResponse.json(
        { success: false, message: 'Delivery not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    if (delivery.status !== 'DRAFT') {
      return NextResponse.json(
        { success: false, message: 'Can only edit draft deliveries', code: 'INVALID_STATUS' },
        { status: 400 }
      )
    }

    const updated = await prisma.deliveryOrder.update({
      where: { id },
      data: {
        customerName: body.customerName,
        warehouseId: body.warehouseId,
        locationId: body.locationId,
        date: body.date ? new Date(body.date) : undefined,
        notes: body.notes,
        items: body.items ? {
          deleteMany: {},
          create: body.items.map((item: { productId: string; quantity: number; unit: string }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        } : undefined,
      },
      include: { items: { include: { product: true } } },
    })

    return NextResponse.json({
      success: true,
      message: 'Delivery updated successfully',
      data: updated,
    })
  } catch (error) {
    console.error('Update delivery error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}