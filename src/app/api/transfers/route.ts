import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { transferSchema } from '@/lib/validations'
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
    const fromWarehouseId = searchParams.get('fromWarehouseId') || ''
    const toWarehouseId = searchParams.get('toWarehouseId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (fromWarehouseId) where.fromWarehouseId = fromWarehouseId
    if (toWarehouseId) where.toWarehouseId = toWarehouseId
    if (dateFrom || dateTo) {
      where.date = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
    }

    const [transfers, total] = await Promise.all([
      prisma.internalTransfer.findMany({
        where,
        include: {
          fromWarehouse: true,
          fromLocation: true,
          toWarehouse: true,
          toLocation: true,
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
      prisma.internalTransfer.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: transfers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get transfers error:', error)
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
    const validation = transferSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { items, ...data } = validation.data

    const transfer = await prisma.internalTransfer.create({
      data: {
        ...data,
        transferNumber: generateDocumentNumber('TRF'),
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
        fromWarehouse: true,
        fromLocation: true,
        toWarehouse: true,
        toLocation: true,
        items: { include: { product: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Internal transfer created successfully',
      data: transfer,
    })
  } catch (error) {
    console.error('Create transfer error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}