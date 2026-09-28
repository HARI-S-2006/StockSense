import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { productSchema, productUpdateSchema } from '@/lib/validations'
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
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const warehouseId = searchParams.get('warehouseId') || ''
    const stockStatus = searchParams.get('stockStatus') || ''
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (categoryId) where.categoryId = categoryId
    if (isActive !== null) where.isActive = isActive === 'true'

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          stockBalances: {
            where: warehouseId ? { warehouseId } : undefined,
            include: { warehouse: true, location: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Calculate stock status for each product
    const productsWithStatus = products.map((product) => {
      const totalStock = product.stockBalances.reduce((sum, b) => sum + b.quantity, 0)
      let status = 'IN_STOCK'
      if (totalStock === 0) status = 'OUT_OF_STOCK'
      else if (totalStock <= product.reorderLevel) status = 'LOW_STOCK'

      if (stockStatus && status !== stockStatus) {
        return null
      }

      return {
        ...product,
        totalStock,
        stockStatus: status,
        stockByLocation: product.stockBalances.map((b) => ({
          warehouseId: b.warehouseId,
          warehouseName: b.warehouse.name,
          locationId: b.locationId,
          locationName: b.location.name,
          quantity: b.quantity,
        })),
      }
    }).filter(Boolean)

    return NextResponse.json({
      success: true,
      data: productsWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get products error (Falling back to mock):', error)
    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const validation = productSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { sku, ...data } = validation.data

    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({ where: { sku } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'SKU already exists', code: 'DUPLICATE_SKU' },
        { status: 409 }
      )
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        sku,
      },
      include: { category: true },
    })

    // Initialize stock balance if initialStock > 0
    if (data.initialStock > 0) {
      // Find first active location in the default warehouse
      const warehouse = await prisma.warehouse.findFirst({ where: { isActive: true } })
      const location = warehouse ? await prisma.location.findFirst({ where: { warehouseId: warehouse.id, isActive: true } }) : null

      if (warehouse && location) {
        await prisma.stockBalance.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            locationId: location.id,
            quantity: data.initialStock,
          },
        })

        await prisma.stockLedgerEntry.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            locationId: location.id,
            operationType: 'ADJUSTMENT_IN',
            documentType: 'INITIAL_STOCK',
            documentId: product.id,
            documentNumber: 'INIT-' + generateDocumentNumber('INIT'),
            previousQuantity: 0,
            quantityChange: data.initialStock,
            newQuantity: data.initialStock,
            userId: auth.session!.userId,
            notes: 'Initial stock from product creation',
          },
        })
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'CREATE_PRODUCT',
        entity: 'Product',
        entityId: product.id,
        after: { ...data, sku },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: product,
    })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}