import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { deliverySchema } from '@/lib/validations'
import { generateDocumentNumber } from '@/lib/utils'

async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const warehouseId = searchParams.get('warehouseId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (warehouseId) where.warehouseId = warehouseId
    if (dateFrom || dateTo) {
      where.date = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
    }

    const [deliveries, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where,
        include: {
          warehouse: true,
          location: true,
          createdBy: { select: { id: true, name: true } },
          validatedBy: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deliveryOrder.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: deliveries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get deliveries error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const validation = deliverySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { items, ...data } = validation.data

    const delivery = await prisma.deliveryOrder.create({
      data: {
        ...data,
        deliveryNumber: generateDocumentNumber('DEL'),
        createdById: auth.session!.userId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        warehouse: true,
        location: true,
        items: { include: { product: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Delivery order created successfully',
      data: delivery,
    })
  } catch (error) {
    console.error('Create delivery error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}