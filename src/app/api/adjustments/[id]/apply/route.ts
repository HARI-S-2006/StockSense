import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { applyAdjustment } from '@/lib/inventory-engine'
import { emitLedgerCreated, emitStockUpdated, emitAlertUpdated } from '@/lib/realtime-server'

async function requireAuth(request: NextRequest) {
  const auth = await verifyAuthToken(request)
  if (!auth) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), auth: null as any }
  }
  return { error: null, auth }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const { id } = await params

    const result = await applyAdjustment(id, auth.auth!.userId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, code: result.code, details: result.details },
        { status: 400 }
      )
    }

    const adjustment = await prisma.inventoryAdjustment.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    })

    if (adjustment) {
      for (const item of adjustment.items) {
        const balance = await prisma.stockBalance.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: adjustment.locationId } },
        })

        if (balance) {
          const operationType = item.difference >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'

          emitStockUpdated({
            productId: item.productId,
            warehouseId: adjustment.location.warehouseId,
            locationId: adjustment.locationId,
            previousQuantity: balance.quantity - item.difference,
            newQuantity: balance.quantity,
            change: item.difference,
            operationType,
            documentNumber: adjustment.adjustmentNumber,
          })

          emitLedgerCreated({
            entry: {
              id: '',
              productId: item.productId,
              productName: item.product.name,
              sku: item.product.sku,
              operationType,
              documentNumber: adjustment.adjustmentNumber,
              quantityChange: item.difference,
              newQuantity: balance.quantity,
              locationName: adjustment.location.name,
              warehouseName: adjustment.location.warehouse.name,
              userName: auth.auth!.name,
              createdAt: new Date().toISOString(),
            },
          })
        }

        const product = await prisma.product.findUnique({ where: { id: item.productId } })
        if (product) {
          const balance = await prisma.stockBalance.findUnique({
            where: { productId_locationId: { productId: item.productId, locationId: adjustment.locationId } },
          })
          if (balance) {
            const previousQty = balance.quantity - item.difference
            let prevStatus = 'IN_STOCK'
            if (previousQty === 0) prevStatus = 'OUT_OF_STOCK'
            else if (previousQty <= product.reorderLevel) prevStatus = 'LOW_STOCK'

            let newStatus = 'IN_STOCK'
            if (balance.quantity === 0) newStatus = 'OUT_OF_STOCK'
            else if (balance.quantity <= product.reorderLevel) newStatus = 'LOW_STOCK'

            if (prevStatus !== newStatus) {
              emitAlertUpdated({
                productId: item.productId,
                locationId: adjustment.locationId,
                previousStatus: prevStatus,
                newStatus: newStatus,
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Apply adjustment error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}