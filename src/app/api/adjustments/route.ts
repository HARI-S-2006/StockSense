import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { adjustmentSchema } from '@/lib/validations'
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
    const locationId = searchParams.get('locationId') || ''
    const productId = searchParams.get('productId') || ''

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (locationId) where.locationId = locationId
    if (productId) where.productId = productId

    const [adjustments, total] = await Promise.all([
      prisma.inventoryAdjustment.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
          location: { include: { warehouse: true } },
          createdBy: { select: { id: true, name: true } },
          appliedBy: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inventoryAdjustment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: adjustments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get adjustments error:', error)
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
    const validation = adjustmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { productId, locationId, recordedQty, countedQty, date, notes } = validation.data
    const difference = countedQty - recordedQty

    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        adjustmentNumber: generateDocumentNumber('ADJ'),
        productId,
        locationId,
        recordedQty,
        countedQty,
        difference,
        date: date ? new Date(date) : new Date(),
        notes,
        createdById: auth.session!.userId,
        items: {
          create: {
            productId,
            recordedQty,
            countedQty,
            difference,
          },
        },
      },
      include: {
        product: true,
        location: { include: { warehouse: true } },
        items: { include: { product: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Inventory adjustment created successfully',
      data: adjustment,
    })
  } catch (error) {
    console.error('Create adjustment error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}