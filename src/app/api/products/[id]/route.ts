import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { productUpdateSchema } from '@/lib/validations'
import { AuditAction } from '@prisma/client'

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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockBalances: {
          include: { warehouse: true, location: true },
        },
        receiptItems: {
          include: { receipt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        deliveryItems: {
          include: { delivery: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        transferItems: {
          include: { transfer: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        adjustmentItems: {
          include: { adjustment: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        ledgerEntries: {
          include: { warehouse: true, location: true, user: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const totalStock = product.stockBalances.reduce((sum, b) => sum + b.quantity, 0)
    let stockStatus = 'IN_STOCK'
    if (totalStock === 0) stockStatus = 'OUT_OF_STOCK'
    else if (totalStock <= product.reorderLevel) stockStatus = 'LOW_STOCK'

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        totalStock,
        stockStatus,
        stockByWarehouse: product.stockBalances.reduce((acc, b) => {
          if (!acc[b.warehouseId]) {
            acc[b.warehouseId] = { warehouseId: b.warehouseId, warehouseName: b.warehouse.name, quantity: 0, locations: [] }
          }
          acc[b.warehouseId].quantity += b.quantity
          acc[b.warehouseId].locations.push({
            locationId: b.locationId,
            locationName: b.location.name,
            quantity: b.quantity,
          })
          return acc
        }, {} as Record<string, { warehouseId: string; warehouseName: string; quantity: number; locations: { locationId: string; locationName: string; quantity: number }[] }>),
        recentMovements: [
          ...product.receiptItems.map((i) => ({ type: 'RECEIPT', documentNumber: i.receipt.receiptNumber, quantity: i.quantity, date: i.createdAt, location: i.receipt.location?.name })),
          ...product.deliveryItems.map((i) => ({ type: 'DELIVERY', documentNumber: i.delivery.deliveryNumber, quantity: -i.quantity, date: i.createdAt, location: i.delivery.location?.name })),
          ...product.transferItems.map((i) => ({ type: 'TRANSFER', documentNumber: i.transfer.transferNumber, quantity: i.quantity, date: i.createdAt, location: i.transfer.fromLocation?.name })),
          ...product.adjustmentItems.map((i) => ({ type: 'ADJUSTMENT', documentNumber: i.adjustment.adjustmentNumber, quantity: i.difference, date: i.createdAt, location: i.adjustment.location?.name })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20),
      },
    })
  } catch (error) {
    console.error('Get product error:', error)
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
    const validation = productUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check SKU uniqueness if changed
    if (validation.data.sku && validation.data.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({ where: { sku: validation.data.sku } })
      if (skuExists) {
        return NextResponse.json(
          { success: false, message: 'SKU already exists', code: 'DUPLICATE_SKU' },
          { status: 409 }
        )
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: validation.data,
      include: { category: true },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'UPDATE_PRODUCT',
        entity: 'Product',
        entityId: product.id,
        before: existing,
        after: product,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    })
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Only managers can delete products
  if (auth.session!.role !== 'INVENTORY_MANAGER') {
    return NextResponse.json(
      { success: false, message: 'Forbidden: Only managers can delete products', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  try {
    const { id } = await params

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json(
        { success: false, message: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if product has stock movements
    const hasMovements = await prisma.stockLedgerEntry.findFirst({ where: { productId: id } })
    if (hasMovements) {
      // Soft delete - mark as inactive
      await prisma.product.update({ where: { id }, data: { isActive: false } })
      
      await prisma.auditLog.create({
        data: {
          userId: auth.session!.userId,
          action: 'DELETE_PRODUCT',
          entity: 'Product',
          entityId: id,
          before: product,
          after: { ...product, isActive: false },
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Product deactivated (has movement history)',
      })
    }

    // Hard delete if no movements
    await prisma.product.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'DELETE_PRODUCT',
        entity: 'Product',
        entityId: id,
        before: product,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}