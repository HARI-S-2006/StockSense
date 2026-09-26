import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { receiptSchema } from '@/lib/validations'
import { generateDocumentNumber } from '@/lib/utils'
import { AuditAction } from '@prisma/client'

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
    const supplierId = searchParams.get('supplierId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (warehouseId) where.warehouseId = warehouseId
    if (supplierId) where.supplierId = supplierId
    if (dateFrom || dateTo) {
      where.date = { gte: dateFrom ? new Date(dateFrom) : undefined, lte: dateTo ? new Date(dateTo) : undefined }
    }

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        include: {
          supplier: true,
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
      prisma.receipt.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: receipts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get receipts error:', error)
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
    const validation = receiptSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { items, ...data } = validation.data

    const receipt = await prisma.receipt.create({
      data: {
        ...data,
        receiptNumber: generateDocumentNumber('RCV'),
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
        supplier: true,
        warehouse: true,
        location: true,
        items: { include: { product: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'CREATE_RECEIPT',
        entity: 'Receipt',
        entityId: receipt.id,
        after: { receiptNumber: receipt.receiptNumber, ...data, itemsCount: items.length },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Receipt created successfully',
      data: receipt,
    })
  } catch (error) {
    console.error('Create receipt error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}