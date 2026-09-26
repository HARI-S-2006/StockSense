import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { validateDelivery } from '@/lib/inventory-engine'
import { emitDeliveryUpdated, emitLedgerCreated, emitStockUpdated, emitAlertUpdated } from '@/lib/socket-server'

async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id } = await params

    const result = await validateDelivery(id, auth.session!.userId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, code: result.code, details: result.details },
        { status: 400 }
      )
    }

    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    })

    if (delivery) {
      emitDeliveryUpdated({
        deliveryId: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        status: 'DONE',
      })

      for (const item of delivery.items) {
        const balance = await prisma.stockBalance.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: delivery.locationId } },
        })

        if (balance) {
          emitStockUpdated({
            productId: item.productId,
            warehouseId: delivery.warehouseId,
            locationId: delivery.locationId,
            previousQuantity: balance.quantity + item.quantity,
            newQuantity: balance.quantity,
            change: -item.quantity,
            operationType: 'DELIVERY',
            documentNumber: delivery.deliveryNumber,
          })

          emitLedgerCreated({
            entry: {
              id: '',
              productId: item.productId,
              productName: item.product.name,
              sku: item.product.sku,
              operationType: 'DELIVERY',
              documentNumber: delivery.deliveryNumber,
              quantityChange: -item.quantity,
              newQuantity: balance.quantity,
              locationName: delivery.location.name,
              warehouseName: delivery.warehouse.name,
              userName: auth.session!.name,
              createdAt: new Date().toISOString(),
            },
          })
        }
      }

      // Check and emit alerts
      for (const item of delivery.items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } })
        if (product) {
          const balance = await prisma.stockBalance.findUnique({
            where: { productId_locationId: { productId: item.productId, locationId: delivery.locationId } },
          })
          if (balance) {
            const previousQty = balance.quantity + item.quantity
            let prevStatus = 'IN_STOCK'
            if (previousQty === 0) prevStatus = 'OUT_OF_STOCK'
            else if (previousQty <= product.reorderLevel) prevStatus = 'LOW_STOCK'

            let newStatus = 'IN_STOCK'
            if (balance.quantity === 0) newStatus = 'OUT_OF_STOCK'
            else if (balance.quantity <= product.reorderLevel) newStatus = 'LOW_STOCK'

            if (prevStatus !== newStatus) {
              emitAlertUpdated({
                productId: item.productId,
                locationId: delivery.locationId,
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
    console.error('Validate delivery error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}