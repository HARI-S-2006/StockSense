// Socket.IO client interface for Next.js API routes

const BACKEND_URL = 'http://localhost:4000'

async function forwardEvent(event: string, data: any) {
  try {
    await fetch(`${BACKEND_URL}/internal/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    })
  } catch (error) {
    console.error(`Failed to forward socket event ${event}:`, error)
  }
}

// Event emitters
export function emitStockUpdated(data: {
  productId: string
  warehouseId: string
  locationId: string
  previousQuantity: number
  newQuantity: number
  change: number
  operationType: string
  documentNumber: string
}) {
  forwardEvent('stock.updated', data)
}

export function emitReceiptUpdated(data: { receiptId: string; receiptNumber: string; status: string }) {
  forwardEvent('receipt.updated', data)
}

export function emitDeliveryUpdated(data: { deliveryId: string; deliveryNumber: string; status: string }) {
  forwardEvent('delivery.updated', data)
}

export function emitTransferUpdated(data: { transferId: string; transferNumber: string; status: string }) {
  forwardEvent('transfer.updated', data)
}

export function emitAdjustmentUpdated(data: { adjustmentId: string; adjustmentNumber: string; status: string }) {
  forwardEvent('adjustment.updated', data)
}

export function emitLedgerCreated(data: {
  entry: {
    id: string
    productId: string
    productName: string
    sku: string
    operationType: string
    documentNumber: string
    quantityChange: number
    newQuantity: number
    locationName: string
    warehouseName: string
    userName: string
    createdAt: string
  }
}) {
  forwardEvent('ledger.created', data)
}

export function emitAlertUpdated(data: {
  productId: string
  locationId: string
  previousStatus: string
  newStatus: string
}) {
  forwardEvent('alert.updated', data)
}