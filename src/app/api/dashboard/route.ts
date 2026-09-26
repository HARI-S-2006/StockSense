import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { dashboardFiltersSchema } from '@/lib/validations'

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
    const warehouseId = searchParams.get('warehouseId') || ''
    const categoryId = searchParams.get('categoryId') || ''

    // Build base where clause for products
    const productWhere: Record<string, unknown> = { isActive: true }
    if (categoryId) productWhere.categoryId = categoryId

    // Get all products with stock balances
    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        category: true,
        stockBalances: {
          where: warehouseId ? { warehouseId } : undefined,
          include: { warehouse: true, location: true },
        },
      },
    })

    // Calculate KPIs
    let totalProductsInStock = 0
    let lowStockItems = 0
    let outOfStockItems = 0

    for (const product of products) {
      const totalStock = product.stockBalances.reduce((sum, b) => sum + b.quantity, 0)
      if (totalStock > 0) totalProductsInStock++
      if (totalStock === 0) outOfStockItems++
      else if (totalStock <= product.reorderLevel) lowStockItems++
    }

    // Pending receipts
    const pendingReceipts = await prisma.receipt.count({
      where: {
        status: { in: ['DRAFT', 'WAITING', 'READY'] },
        ...(warehouseId ? { warehouseId } : {}),
      },
    })

    // Pending deliveries
    const pendingDeliveries = await prisma.deliveryOrder.count({
      where: {
        status: { in: ['DRAFT', 'WAITING', 'READY'] },
        ...(warehouseId ? { warehouseId } : {}),
      },
    })

    // Pending transfers
    const pendingTransfers = await prisma.internalTransfer.count({
      where: {
        status: { in: ['DRAFT', 'WAITING', 'READY'] },
        OR: [
          { fromWarehouseId: warehouseId || '' },
          { toWarehouseId: warehouseId || '' },
        ],
      },
    })

    // Low stock alerts
    const lowStockProducts = products
      .map((p) => {
        const totalStock = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0)
        return { product: p, totalStock }
      })
      .filter((p) => p.totalStock > 0 && p.totalStock <= p.product.reorderLevel)
      .slice(0, 10)

    // Out of stock products
    const outOfStockProducts = products
      .map((p) => {
        const totalStock = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0)
        return { product: p, totalStock }
      })
      .filter((p) => p.totalStock === 0)
      .slice(0, 10)

    // Recent activity (last 20 ledger entries)
    const recentActivity = await prisma.stockLedgerEntry.findMany({
      where: warehouseId ? { warehouseId } : {},
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Stock by warehouse
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        stockBalances: {
          where: { quantity: { gt: 0 } },
          include: { product: true },
        },
      },
    })

    const stockByWarehouse = warehouses.map((w) => ({
      warehouseId: w.id,
      warehouseName: w.name,
      totalProducts: w.stockBalances.length,
      totalQuantity: w.stockBalances.reduce((sum, b) => sum + b.quantity, 0),
    }))

    // Stock by location
    const locations = await prisma.location.findMany({
      where: { isActive: true, ...(warehouseId ? { warehouseId } : {}) },
      include: {
        warehouse: true,
        stockBalances: {
          where: { quantity: { gt: 0 } },
          include: { product: true },
        },
      },
    })

    const stockByLocation = locations.map((l) => ({
      locationId: l.id,
      locationName: l.name,
      warehouseName: l.warehouse?.name,
      totalProducts: l.stockBalances.length,
      totalQuantity: l.stockBalances.reduce((sum, b) => sum + b.quantity, 0),
    }))

    // Pending operations
    const pendingOperations = [
      ...(await prisma.receipt.findMany({
        where: { status: { in: ['WAITING', 'READY'] }, ...(warehouseId ? { warehouseId } : {}) },
        include: { supplier: true, location: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      })).map((r) => ({ type: 'RECEIPT', id: r.id, number: r.receiptNumber, status: r.status, location: r.location.name, date: r.createdAt })),
      ...(await prisma.deliveryOrder.findMany({
        where: { status: { in: ['WAITING', 'READY'] }, ...(warehouseId ? { warehouseId } : {}) },
        include: { location: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      })).map((d) => ({ type: 'DELIVERY', id: d.id, number: d.deliveryNumber, status: d.status, location: d.location.name, date: d.createdAt })),
      ...(await prisma.internalTransfer.findMany({
        where: { status: { in: ['WAITING', 'READY'] }, OR: [{ fromWarehouseId: warehouseId || '' }, { toWarehouseId: warehouseId || '' }] },
        include: { fromLocation: true, toLocation: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
      })).map((t) => ({ type: 'TRANSFER', id: t.id, number: t.transferNumber, status: t.status, from: t.fromLocation.name, to: t.toLocation.name, date: t.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalProductsInStock,
          lowStockItems,
          outOfStockItems,
          pendingReceipts,
          pendingDeliveries,
          pendingTransfers,
        },
        lowStockAlerts: lowStockProducts.map((p) => ({
          productId: p.product.id,
          productName: p.product.name,
          sku: p.product.sku,
          currentStock: p.totalStock,
          reorderLevel: p.product.reorderLevel,
          unit: p.product.unitOfMeasure,
        })),
        outOfStockAlerts: outOfStockProducts.map((p) => ({
          productId: p.product.id,
          productName: p.product.name,
          sku: p.product.sku,
          unit: p.product.unitOfMeasure,
        })),
        recentActivity: recentActivity.map((e) => ({
          id: e.id,
          productName: e.product.name,
          sku: e.product.sku,
          operationType: e.operationType,
          documentNumber: e.documentNumber,
          quantityChange: e.quantityChange,
          newQuantity: e.newQuantity,
          warehouse: e.warehouse.name,
          location: e.location.name,
          user: e.user.name,
          date: e.createdAt,
        })),
        stockByWarehouse,
        stockByLocation,
        pendingOperations,
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}