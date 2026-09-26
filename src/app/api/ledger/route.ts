import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { ledgerFiltersSchema } from '@/lib/validations'

async function requireAuth(request: NextRequest) {
  const auth = await verifyAuthToken(request)
  if (!auth) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), auth: null as any }
  }
  return { error: null, auth }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const productId = searchParams.get('productId') || ''
    const warehouseId = searchParams.get('warehouseId') || ''
    const locationId = searchParams.get('locationId') || ''
    const operationType = searchParams.get('operationType') || ''
    const documentType = searchParams.get('documentType') || ''
    const documentNumber = searchParams.get('documentNumber') || ''
    const userId = searchParams.get('userId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Record<string, unknown> = {}

    if (productId) where.productId = productId
    if (warehouseId) where.warehouseId = warehouseId
    if (locationId) where.locationId = locationId
    if (operationType && operationType !== 'ALL') where.operationType = operationType
    if (documentType) where.documentType = documentType
    if (documentNumber) where.documentNumber = { contains: documentNumber, mode: 'insensitive' }
    if (userId) where.userId = userId
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    const [entries, total] = await Promise.all([
      prisma.stockLedgerEntry.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, unitOfMeasure: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockLedgerEntry.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get ledger error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}