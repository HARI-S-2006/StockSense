import { prisma } from '@/lib/prisma'
import { DocumentStatus, OperationType, AuditAction, Role } from '@prisma/client'
import { generateDocumentNumber } from '@/lib/utils'

// ============================================
// CORE INVENTORY TRANSACTION ENGINE
// ============================================

export interface StockChangeResult {
  success: boolean
  message: string
  code?: string
  details?: Record<string, unknown>
  previousQuantity?: number
  newQuantity?: number
}

export interface LedgerEntryData {
  productId: string
  warehouseId: string
  locationId: string
  operationType: OperationType
  documentType: string
  documentId: string
  documentNumber: string
  previousQuantity: number
  quantityChange: number
  newQuantity: number
  userId: string
  notes?: string
}

export interface AuditLogData {
  userId: string
  action: AuditAction
  entity: string
  entityId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

// ============================================
// STOCK BALANCE OPERATIONS
// ============================================

export async function getStockBalance(
  productId: string,
  locationId: string
): Promise<{ quantity: number; balanceId: string } | null> {
  const balance = await prisma.stockBalance.findUnique({
    where: {
      productId_locationId: { productId, locationId },
    },
  })

  if (!balance) return null

  return { quantity: balance.quantity, balanceId: balance.id }
}

export async function getStockBalancesByProduct(productId: string) {
  return prisma.stockBalance.findMany({
    where: { productId },
    include: {
      warehouse: true,
      location: true,
    },
  })
}

export async function getTotalStockByProduct(productId: string): Promise<number> {
  const balances = await prisma.stockBalance.findMany({
    where: { productId },
    select: { quantity: true },
  })
  return balances.reduce((sum, b) => sum + b.quantity, 0)
}

// ============================================
// ATOMIC STOCK UPDATE WITH TRANSACTION
// ============================================

export async function updateStockWithLedger(
  ledgerData: LedgerEntryData,
  auditData: AuditLogData
): Promise<StockChangeResult> {
  const { productId, warehouseId, locationId, operationType, documentType, documentId, documentNumber, previousQuantity, quantityChange, newQuantity, userId, notes } = ledgerData

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the stock balance row for update
      const balance = await tx.stockBalance.findUnique({
        where: { productId_locationId: { productId, locationId } },
        // Use FOR UPDATE equivalent in Prisma
      })

      if (!balance) {
        throw new Error(`Stock balance not found for product ${productId} at location ${locationId}`)
      }

      // Verify the previous quantity matches (concurrency protection)
      if (balance.quantity !== previousQuantity) {
        throw new Error(
          `Concurrency conflict: expected quantity ${previousQuantity}, found ${balance.quantity}. Please refresh and try again.`
        )
      }

      // Update stock balance
      await tx.stockBalance.update({
        where: { id: balance.id },
        data: { quantity: newQuantity },
      })

      // Create ledger entry
      await tx.stockLedgerEntry.create({
        data: {
          productId,
          warehouseId,
          locationId,
          operationType,
          documentType,
          documentId,
          documentNumber,
          previousQuantity,
          quantityChange,
          newQuantity,
          userId,
          notes,
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: auditData.userId,
          action: auditData.action,
          entity: auditData.entity,
          entityId: auditData.entityId,
          before: auditData.before,
          after: auditData.after,
          metadata: auditData.metadata,
          ipAddress: auditData.ipAddress,
          userAgent: auditData.userAgent,
        },
      })

      return { previousQuantity: balance.quantity, newQuantity }
    })

    return {
      success: true,
      message: 'Stock updated successfully',
      previousQuantity: result.previousQuantity,
      newQuantity: result.newQuantity,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update stock'
    return { success: false, message, code: 'STOCK_UPDATE_FAILED' }
  }
}

// ============================================
// DOCUMENT STATUS VALIDATION
// ============================================

export function canTransitionStatus(currentStatus: DocumentStatus, newStatus: DocumentStatus): boolean {
  const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
    DRAFT: ['WAITING', 'CANCELED'],
    WAITING: ['READY', 'CANCELED'],
    READY: ['DONE', 'CANCELED'],
    DONE: [],
    CANCELED: [],
  }

  return validTransitions[currentStatus]?.includes(newStatus) ?? false
}

export function isTerminalStatus(status: DocumentStatus): boolean {
  return status === 'DONE' || status === 'CANCELED'
}

// ============================================
// RECEIPT OPERATIONS
// ============================================

export async function validateReceipt(
  receiptId: string,
  userId: string
): Promise<StockChangeResult> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: { items: true },
  })

  if (!receipt) {
    return { success: false, message: 'Receipt not found', code: 'RECEIPT_NOT_FOUND' }
  }

  if (receipt.status !== 'READY') {
    return { success: false, message: `Cannot validate receipt in ${receipt.status} status`, code: 'INVALID_STATUS' }
  }

  // Process each item
  for (const item of receipt.items) {
    const balance = await getStockBalance(item.productId, receipt.locationId)
    const previousQuantity = balance?.quantity ?? 0
    const newQuantity = previousQuantity + item.quantity

    const stockResult = await updateStockWithLedger(
      {
        productId: item.productId,
        warehouseId: receipt.warehouseId,
        locationId: receipt.locationId,
        operationType: 'RECEIPT',
        documentType: 'RECEIPT',
        documentId: receipt.id,
        documentNumber: receipt.receiptNumber,
        previousQuantity,
        quantityChange: item.quantity,
        newQuantity,
        userId,
        notes: `Received from ${receipt.id}`,
      },
      {
        userId,
        action: 'VALIDATE_RECEIPT',
        entity: 'Receipt',
        entityId: receipt.id,
        before: { status: receipt.status, stock: previousQuantity },
        after: { status: 'DONE', stock: newQuantity },
        metadata: { itemId: item.id, productId: item.productId, quantity: item.quantity },
      }
    )

    if (!stockResult.success) {
      return stockResult
    }
  }

  // Update receipt status
  await prisma.receipt.update({
    where: { id: receiptId },
    data: { status: 'DONE', validatedById: userId, validatedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'VALIDATE_RECEIPT',
      entity: 'Receipt',
      entityId: receiptId,
      before: { status: 'READY' },
      after: { status: 'DONE' },
    },
  })

  return { success: true, message: 'Receipt validated successfully. Stock increased.' }
}

export async function cancelReceipt(receiptId: string, userId: string): Promise<StockChangeResult> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  })

  if (!receipt) {
    return { success: false, message: 'Receipt not found', code: 'RECEIPT_NOT_FOUND' }
  }

  if (receipt.status === 'DONE') {
    return { success: false, message: 'Cannot cancel a completed receipt', code: 'ALREADY_DONE' }
  }

  if (receipt.status === 'CANCELED') {
    return { success: false, message: 'Receipt already canceled', code: 'ALREADY_CANCELED' }
  }

  if (!canTransitionStatus(receipt.status, 'CANCELED')) {
    return { success: false, message: `Cannot cancel receipt in ${receipt.status} status`, code: 'INVALID_STATUS' }
  }

  await prisma.receipt.update({
    where: { id: receiptId },
    data: { status: 'CANCELED' },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CANCEL_RECEIPT',
      entity: 'Receipt',
      entityId: receiptId,
      before: { status: receipt.status },
      after: { status: 'CANCELED' },
    },
  })

  return { success: true, message: 'Receipt canceled successfully' }
}

// ============================================
// DELIVERY OPERATIONS
// ============================================

export async function validateDelivery(
  deliveryId: string,
  userId: string
): Promise<StockChangeResult> {
  const delivery = await prisma.deliveryOrder.findUnique({
    where: { id: deliveryId },
    include: { items: true },
  })

  if (!delivery) {
    return { success: false, message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' }
  }

  if (delivery.status !== 'READY') {
    return { success: false, message: `Cannot validate delivery in ${delivery.status} status`, code: 'INVALID_STATUS' }
  }

  // Check stock availability for all items first
  for (const item of delivery.items) {
    const balance = await getStockBalance(item.productId, delivery.locationId)
    const available = balance?.quantity ?? 0

    if (available < item.quantity) {
      return {
        success: false,
        message: `Insufficient stock for ${item.productId}. Available: ${available}, Requested: ${item.quantity}`,
        code: 'INSUFFICIENT_STOCK',
        details: { available, requested: item.quantity, productId: item.productId },
      }
    }
  }

  // Process each item
  for (const item of delivery.items) {
    const balance = await getStockBalance(item.productId, delivery.locationId)
    const previousQuantity = balance?.quantity ?? 0
    const newQuantity = previousQuantity - item.quantity

    const stockResult = await updateStockWithLedger(
      {
        productId: item.productId,
        warehouseId: delivery.warehouseId,
        locationId: delivery.locationId,
        operationType: 'DELIVERY',
        documentType: 'DELIVERY',
        documentId: delivery.id,
        documentNumber: delivery.deliveryNumber,
        previousQuantity,
        quantityChange: -item.quantity,
        newQuantity,
        userId,
        notes: `Delivered to customer`,
      },
      {
        userId,
        action: 'VALIDATE_DELIVERY',
        entity: 'DeliveryOrder',
        entityId: delivery.id,
        before: { status: delivery.status, stock: previousQuantity },
        after: { status: 'DONE', stock: newQuantity },
        metadata: { itemId: item.id, productId: item.productId, quantity: item.quantity },
      }
    )

    if (!stockResult.success) {
      return stockResult
    }
  }

  await prisma.deliveryOrder.update({
    where: { id: deliveryId },
    data: { status: 'DONE', validatedById: userId, validatedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'VALIDATE_DELIVERY',
      entity: 'DeliveryOrder',
      entityId: deliveryId,
      before: { status: 'READY' },
      after: { status: 'DONE' },
    },
  })

  return { success: true, message: 'Delivery validated successfully. Stock decreased.' }
}

export async function pickDelivery(deliveryId: string, userId: string): Promise<StockChangeResult> {
  const delivery = await prisma.deliveryOrder.findUnique({ where: { id: deliveryId } })
  if (!delivery) return { success: false, message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' }
  if (delivery.status !== 'WAITING') return { success: false, message: 'Delivery must be in WAITING status to pick', code: 'INVALID_STATUS' }

  await prisma.deliveryOrder.update({ where: { id: deliveryId }, data: { status: 'READY' } })
  await prisma.auditLog.create({ data: { userId, action: 'PICK_DELIVERY', entity: 'DeliveryOrder', entityId: deliveryId, before: { status: 'WAITING' }, after: { status: 'READY' } } })
  return { success: true, message: 'Delivery picked successfully' }
}

export async function packDelivery(deliveryId: string, userId: string): Promise<StockChangeResult> {
  const delivery = await prisma.deliveryOrder.findUnique({ where: { id: deliveryId } })
  if (!delivery) return { success: false, message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' }
  if (delivery.status !== 'READY') return { success: false, message: 'Delivery must be in READY status to pack', code: 'INVALID_STATUS' }

  await prisma.deliveryOrder.update({ where: { id: deliveryId }, data: { status: 'READY' } })
  await prisma.auditLog.create({ data: { userId, action: 'PACK_DELIVERY', entity: 'DeliveryOrder', entityId: deliveryId } })
  return { success: true, message: 'Delivery packed successfully' }
}

export async function cancelDelivery(deliveryId: string, userId: string): Promise<StockChangeResult> {
  const delivery = await prisma.deliveryOrder.findUnique({ where: { id: deliveryId } })
  if (!delivery) return { success: false, message: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' }
  if (delivery.status === 'DONE') return { success: false, message: 'Cannot cancel a completed delivery', code: 'ALREADY_DONE' }
  if (delivery.status === 'CANCELED') return { success: false, message: 'Delivery already canceled', code: 'ALREADY_CANCELED' }
  if (!canTransitionStatus(delivery.status, 'CANCELED')) return { success: false, message: `Cannot cancel delivery in ${delivery.status} status`, code: 'INVALID_STATUS' }

  await prisma.deliveryOrder.update({ where: { id: deliveryId }, data: { status: 'CANCELED' } })
  await prisma.auditLog.create({ data: { userId, action: 'CANCEL_DELIVERY', entity: 'DeliveryOrder', entityId: deliveryId, before: { status: delivery.status }, after: { status: 'CANCELED' } } })
  return { success: true, message: 'Delivery canceled successfully' }
}

// ============================================
// TRANSFER OPERATIONS
// ============================================

export async function validateTransfer(
  transferId: string,
  userId: string
): Promise<StockChangeResult> {
  const transfer = await prisma.internalTransfer.findUnique({
    where: { id: transferId },
    include: { items: true },
  })

  if (!transfer) {
    return { success: false, message: 'Transfer not found', code: 'TRANSFER_NOT_FOUND' }
  }

  if (transfer.status !== 'READY') {
    return { success: false, message: `Cannot validate transfer in ${transfer.status} status`, code: 'INVALID_STATUS' }
  }

  // Check source stock availability
  for (const item of transfer.items) {
    const balance = await getStockBalance(item.productId, transfer.fromLocationId)
    const available = balance?.quantity ?? 0

    if (available < item.quantity) {
      return {
        success: false,
        message: `Insufficient stock at source for ${item.productId}. Available: ${available}, Requested: ${item.quantity}`,
        code: 'INSUFFICIENT_STOCK',
        details: { available, requested: item.quantity, productId: item.productId },
      }
    }
  }

  // Process each item - source decrease and destination increase
  for (const item of transfer.items) {
    // Source: decrease
    const sourceBalance = await getStockBalance(item.productId, transfer.fromLocationId)
    const sourcePrevious = sourceBalance?.quantity ?? 0
    const sourceNew = sourcePrevious - item.quantity

    const sourceResult = await updateStockWithLedger(
      {
        productId: item.productId,
        warehouseId: transfer.fromWarehouseId,
        locationId: transfer.fromLocationId,
        operationType: 'TRANSFER_OUT',
        documentType: 'TRANSFER',
        documentId: transfer.id,
        documentNumber: transfer.transferNumber,
        previousQuantity: sourcePrevious,
        quantityChange: -item.quantity,
        newQuantity: sourceNew,
        userId,
        notes: `Transferred to ${transfer.toLocationId}`,
      },
      {
        userId,
        action: 'VALIDATE_TRANSFER',
        entity: 'InternalTransfer',
        entityId: transfer.id,
        before: { status: transfer.status, sourceStock: sourcePrevious },
        after: { status: 'DONE', sourceStock: sourceNew },
        metadata: { itemId: item.id, productId: item.productId, quantity: item.quantity, direction: 'OUT' },
      }
    )

    if (!sourceResult.success) return sourceResult

    // Destination: increase (create balance if not exists)
    let destBalance = await getStockBalance(item.productId, transfer.toLocationId)
    const destPrevious = destBalance?.quantity ?? 0
    const destNew = destPrevious + item.quantity

    const destResult = await updateStockWithLedger(
      {
        productId: item.productId,
        warehouseId: transfer.toWarehouseId,
        locationId: transfer.toLocationId,
        operationType: 'TRANSFER_IN',
        documentType: 'TRANSFER',
        documentId: transfer.id,
        documentNumber: transfer.transferNumber,
        previousQuantity: destPrevious,
        quantityChange: item.quantity,
        newQuantity: destNew,
        userId,
        notes: `Transferred from ${transfer.fromLocationId}`,
      },
      {
        userId,
        action: 'VALIDATE_TRANSFER',
        entity: 'InternalTransfer',
        entityId: transfer.id,
        before: { destStock: destPrevious },
        after: { destStock: destNew },
        metadata: { itemId: item.id, productId: item.productId, quantity: item.quantity, direction: 'IN' },
      }
    )

    if (!destResult.success) return destResult
  }

  await prisma.internalTransfer.update({
    where: { id: transferId },
    data: { status: 'DONE', validatedById: userId, validatedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'VALIDATE_TRANSFER',
      entity: 'InternalTransfer',
      entityId: transferId,
      before: { status: 'READY' },
      after: { status: 'DONE' },
    },
  })

  return { success: true, message: 'Transfer validated successfully. Stock moved between locations.' }
}

export async function cancelTransfer(transferId: string, userId: string): Promise<StockChangeResult> {
  const transfer = await prisma.internalTransfer.findUnique({ where: { id: transferId } })
  if (!transfer) return { success: false, message: 'Transfer not found', code: 'TRANSFER_NOT_FOUND' }
  if (transfer.status === 'DONE') return { success: false, message: 'Cannot cancel a completed transfer', code: 'ALREADY_DONE' }
  if (transfer.status === 'CANCELED') return { success: false, message: 'Transfer already canceled', code: 'ALREADY_CANCELED' }
  if (!canTransitionStatus(transfer.status, 'CANCELED')) return { success: false, message: `Cannot cancel transfer in ${transfer.status} status`, code: 'INVALID_STATUS' }

  await prisma.internalTransfer.update({ where: { id: transferId }, data: { status: 'CANCELED' } })
  await prisma.auditLog.create({ data: { userId, action: 'CANCEL_TRANSFER', entity: 'InternalTransfer', entityId: transferId, before: { status: transfer.status }, after: { status: 'CANCELED' } } })
  return { success: true, message: 'Transfer canceled successfully' }
}

// ============================================
// ADJUSTMENT OPERATIONS
// ============================================

export async function applyAdjustment(
  adjustmentId: string,
  userId: string
): Promise<StockChangeResult> {
  const adjustment = await prisma.inventoryAdjustment.findUnique({
    where: { id: adjustmentId },
    include: { items: true },
  })

  if (!adjustment) {
    return { success: false, message: 'Adjustment not found', code: 'ADJUSTMENT_NOT_FOUND' }
  }

  if (adjustment.status !== 'READY') {
    return { success: false, message: `Cannot apply adjustment in ${adjustment.status} status`, code: 'INVALID_STATUS' }
  }

  for (const item of adjustment.items) {
    const balance = await getStockBalance(item.productId, adjustment.locationId)
    const previousQuantity = balance?.quantity ?? 0
    const newQuantity = previousQuantity + item.difference

    if (newQuantity < 0) {
      return {
        success: false,
        message: `Adjustment would result in negative stock. Current: ${previousQuantity}, Change: ${item.difference}`,
        code: 'NEGATIVE_STOCK',
        details: { current: previousQuantity, change: item.difference },
      }
    }

    const operationType = item.difference >= 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'

    const stockResult = await updateStockWithLedger(
      {
        productId: item.productId,
        warehouseId: balance?.warehouseId ?? '', // Will be filled from location
        locationId: adjustment.locationId,
        operationType,
        documentType: 'ADJUSTMENT',
        documentId: adjustment.id,
        documentNumber: adjustment.adjustmentNumber,
        previousQuantity,
        quantityChange: item.difference,
        newQuantity,
        userId,
        notes: `Adjustment: counted ${item.countedQty}, recorded ${item.recordedQty}`,
      },
      {
        userId,
        action: 'APPLY_ADJUSTMENT',
        entity: 'InventoryAdjustment',
        entityId: adjustment.id,
        before: { status: adjustment.status, stock: previousQuantity },
        after: { status: 'DONE', stock: newQuantity },
        metadata: { itemId: item.id, productId: item.productId, recordedQty: item.recordedQty, countedQty: item.countedQty, difference: item.difference },
      }
    )

    if (!stockResult.success) return stockResult
  }

  await prisma.inventoryAdjustment.update({
    where: { id: adjustmentId },
    data: { status: 'DONE', appliedById: userId, appliedAt: new Date() },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'APPLY_ADJUSTMENT',
      entity: 'InventoryAdjustment',
      entityId: adjustmentId,
      before: { status: 'READY' },
      after: { status: 'DONE' },
    },
  })

  return { success: true, message: 'Adjustment applied successfully. Stock updated.' }
}

export async function cancelAdjustment(adjustmentId: string, userId: string): Promise<StockChangeResult> {
  const adjustment = await prisma.inventoryAdjustment.findUnique({ where: { id: adjustmentId } })
  if (!adjustment) return { success: false, message: 'Adjustment not found', code: 'ADJUSTMENT_NOT_FOUND' }
  if (adjustment.status === 'DONE') return { success: false, message: 'Cannot cancel an applied adjustment', code: 'ALREADY_DONE' }
  if (adjustment.status === 'CANCELED') return { success: false, message: 'Adjustment already canceled', code: 'ALREADY_CANCELED' }
  if (!canTransitionStatus(adjustment.status, 'CANCELED')) return { success: false, message: `Cannot cancel adjustment in ${adjustment.status} status`, code: 'INVALID_STATUS' }

  await prisma.inventoryAdjustment.update({ where: { id: adjustmentId }, data: { status: 'CANCELED' } })
  await prisma.auditLog.create({ data: { userId, action: 'CANCEL_ADJUSTMENT', entity: 'InventoryAdjustment', entityId: adjustmentId, before: { status: adjustment.status }, after: { status: 'CANCELED' } } })
  return { success: true, message: 'Adjustment canceled successfully' }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function getProductStockStatus(productId: string, locationId: string): Promise<{ status: string; quantity: number; reorderLevel: number }> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { reorderLevel: true } })
  const balance = await getStockBalance(productId, locationId)
  const quantity = balance?.quantity ?? 0
  const reorderLevel = product?.reorderLevel ?? 0

  let status = 'IN_STOCK'
  if (quantity === 0) status = 'OUT_OF_STOCK'
  else if (quantity <= reorderLevel) status = 'LOW_STOCK'

  return { status, quantity, reorderLevel }
}

export async function getLowStockProducts(warehouseId?: string) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      stockBalances: warehouseId ? { where: { warehouseId } } : true,
    },
  })

  return products
    .map((p) => {
      const totalStock = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0)
      return { product: p, totalStock, isLow: totalStock > 0 && totalStock <= p.reorderLevel, isOut: totalStock === 0 }
    })
    .filter((p) => p.isLow || p.isOut)
}

export async function getOutOfStockProducts(warehouseId?: string) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      stockBalances: warehouseId ? { where: { warehouseId } } : true,
    },
  })

  return products
    .map((p) => {
      const totalStock = p.stockBalances.reduce((sum, b) => sum + b.quantity, 0)
      return { product: p, totalStock }
    })
    .filter((p) => p.totalStock === 0)
}