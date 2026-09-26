import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { validateTransfer } from '@/lib/inventory-engine'
import { emitTransferUpdated, emitLedgerCreated, emitStockUpdated, emitAlertUpdated } from '@/lib/socket-server'

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

    const result = await validateTransfer(id, auth.session!.userId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, code: result.code, details: result.details },
        { status: 400 }
      )
    }

    const transfer = await prisma.internalTransfer.findUnique({
      where: { id },
      include: { 
        items: { include: { product: true } },
        fromLocation: { include: { warehouse: true } },
        fromWarehouse: true,
        toLocation: { include: { warehouse: true } },
        toWarehouse: true
      },
    })

    if (transfer) {
      emitTransferUpdated({
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
        status: 'DONE',
      })

      for (const item of transfer.items) {
        // Source stock update
        const sourceBalance = await prisma.stockBalance.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: transfer.fromLocationId } },
        })

        if (sourceBalance) {
          emitStockUpdated({
            productId: item.productId,
            warehouseId: transfer.fromWarehouseId,
            locationId: transfer.fromLocationId,
            previousQuantity: sourceBalance.quantity + item.quantity,
            newQuantity: sourceBalance.quantity,
            change: -item.quantity,
            operationType: 'TRANSFER_OUT',
            documentNumber: transfer.transferNumber,
          })

          emitLedgerCreated({
            entry: {
              id: '',
              productId: item.productId,
              productName: item.product.name,
              sku: item.product.sku,
              operationType: 'TRANSFER_OUT',
              documentNumber: transfer.transferNumber,
              quantityChange: -item.quantity,
              newQuantity: sourceBalance.quantity,
              locationName: transfer.fromLocation.name,
              warehouseName: transfer.fromWarehouse.name,
              userName: auth.session!.name,
              createdAt: new Date().toISOString(),
            },
          })
        }

        // Destination stock update
        const destBalance = await prisma.stockBalance.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: transfer.toLocationId } },
        })

        if (destBalance) {
          emitStockUpdated({
            productId: item.productId,
            warehouseId: transfer.toWarehouseId,
            locationId: transfer.toLocationId,
            previousQuantity: destBalance.quantity - item.quantity,
            newQuantity: destBalance.quantity,
            change: item.quantity,
            operationType: 'TRANSFER_IN',
            documentNumber: transfer.transferNumber,
          })

          emitLedgerCreated({
            entry: {
              id: '',
              productId: item.productId,
              productName: item.product.name,
              sku: item.product.sku,
              operationType: 'TRANSFER_IN',
              documentNumber: transfer.transferNumber,
              quantityChange: item.quantity,
              newQuantity: destBalance.quantity,
              locationName: transfer.toLocation.name,
              warehouseName: transfer.toWarehouse.name,
              userName: auth.session!.name,
              createdAt: new Date().toISOString(),
            },
          })
        }

        // Check alerts for source
        const product = await prisma.product.findUnique({ where: { id: item.productId } })
        if (product && sourceBalance) {
          const previousQty = sourceBalance.quantity + item.quantity
          let prevStatus = 'IN_STOCK'
          if (previousQty === 0) prevStatus = 'OUT_OF_STOCK'
          else if (previousQty <= product.reorderLevel) prevStatus = 'LOW_STOCK'

          let newStatus = 'IN_STOCK'
          if (sourceBalance.quantity === 0) newStatus = 'OUT_OF_STOCK'
          else if (sourceBalance.quantity <= product.reorderLevel) newStatus = 'LOW_STOCK'

          if (prevStatus !== newStatus) {
            emitAlertUpdated({
              productId: item.productId,
              locationId: transfer.fromLocationId,
              previousStatus: prevStatus,
              newStatus: newStatus,
            })
          }
        }

        // Check alerts for destination
        if (product && destBalance) {
          const previousQty = destBalance.quantity - item.quantity
          let prevStatus = 'IN_STOCK'
          if (previousQty === 0) prevStatus = 'OUT_OF_STOCK'
          else if (previousQty <= product.reorderLevel) prevStatus = 'LOW_STOCK'

          let newStatus = 'IN_STOCK'
          if (destBalance.quantity === 0) newStatus = 'OUT_OF_STOCK'
          else if (destBalance.quantity <= product.reorderLevel) newStatus = 'LOW_STOCK'

          if (prevStatus !== newStatus) {
            emitAlertUpdated({
              productId: item.productId,
              locationId: transfer.toLocationId,
              previousStatus: prevStatus,
              newStatus: newStatus,
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Validate transfer error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}