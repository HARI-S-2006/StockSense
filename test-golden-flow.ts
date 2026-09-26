import { prisma } from './src/lib/prisma'
import {
  validateReceipt,
  validateTransfer,
  validateDelivery,
  pickDelivery,
  packDelivery,
  applyAdjustment,
  getStockBalance
} from './src/lib/inventory-engine'

async function runGoldenTest() {
  console.log('--- STARTING GOLDEN TEST ---')

  // 1. Get or Create User
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test' + Date.now() + '@example.com',
        passwordHash: 'dummy',
        name: 'Test User',
        role: 'ADMIN'
      }
    })
  }
  const userId = user.id

  // 2. Setup Warehouse & Locations
  const warehouse = await prisma.warehouse.create({
    data: { name: 'HQ ' + Date.now(), address: 'HQ', code: 'HQ' + Date.now().toString().slice(-4) }
  })
  const mainStore = await prisma.location.create({
    data: { name: 'Main Store', warehouseId: warehouse.id, code: 'MAIN' + Date.now().toString().slice(-4) }
  })
  const prodRack = await prisma.location.create({
    data: { name: 'Production Rack', warehouseId: warehouse.id, code: 'PROD' + Date.now().toString().slice(-4) }
  })

  const product = await prisma.product.create({
    data: {
      name: 'Steel Rods',
      sku: 'STEEL-' + Date.now(),
      description: 'Test material',
      categoryId: (await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Raw' } })).id,
      unitOfMeasure: 'kg',
      isActive: true,
      reorderLevel: 20
    }
  })

  // INITIAL STATE
  console.log(`Initial Steel: 0 kg`)

  // 4. Receipt (+100)
  const supplier = await prisma.supplier.findFirst() || await prisma.supplier.create({ data: { name: 'ACME', code: 'ACME', email: 'test@acme.com', phone: '123' } })
  const receipt = await prisma.receipt.create({
    data: {
      receiptNumber: 'REC-' + Date.now(),
      warehouseId: warehouse.id,
      locationId: mainStore.id,
      supplierId: supplier.id,
      status: 'READY',
      createdById: userId,
      items: {
        create: [{ productId: product.id, quantity: 100, unit: 'kg' }]
      }
    }
  })
  await validateReceipt(receipt.id, userId)
  let balance = await getStockBalance(product.id, mainStore.id)
  console.log(`After Receipt (+100) -> Main Store: ${balance?.quantity} kg`)

  // 5. Transfer (Main Store -> Production Rack, 100 kg)
  const transfer = await prisma.internalTransfer.create({
    data: {
      transferNumber: 'TRN-' + Date.now(),
      fromWarehouseId: warehouse.id,
      toWarehouseId: warehouse.id,
      fromLocationId: mainStore.id,
      toLocationId: prodRack.id,
      status: 'READY',
      createdById: userId,
      items: {
        create: [{ productId: product.id, quantity: 100, unit: 'kg' }]
      }
    }
  })
  await validateTransfer(transfer.id, userId)
  balance = await getStockBalance(product.id, mainStore.id)
  let destBalance = await getStockBalance(product.id, prodRack.id)
  console.log(`After Transfer (100) -> Main Store: ${balance?.quantity ?? 0} kg | Production Rack: ${destBalance?.quantity} kg`)

  // 6. Delivery (-20)
  const delivery = await prisma.deliveryOrder.create({
    data: {
      deliveryNumber: 'DEL-' + Date.now(),
      warehouseId: warehouse.id,
      locationId: prodRack.id,
      status: 'WAITING',
      createdById: userId,
      customerName: 'Test Customer',
      items: {
        create: [{ productId: product.id, quantity: 20, unit: 'kg' }]
      }
    }
  })
  await pickDelivery(delivery.id, userId)
  await packDelivery(delivery.id, userId)
  await validateDelivery(delivery.id, userId)
  destBalance = await getStockBalance(product.id, prodRack.id)
  console.log(`After Delivery (-20) -> Production Rack: ${destBalance?.quantity} kg`)

  // 7. Adjustment (-3)
  const adjustment = await prisma.inventoryAdjustment.create({
    data: {
      adjustmentNumber: 'ADJ-' + Date.now(),
      locationId: prodRack.id,
      status: 'READY',
      createdById: userId,
      notes: 'Damage',
      productId: product.id,
      recordedQty: 80,
      countedQty: 77,
      difference: -3
    }
  })
  await applyAdjustment(adjustment.id, userId)
  destBalance = await getStockBalance(product.id, prodRack.id)
  console.log(`After Adjustment (-3) -> Production Rack: ${destBalance?.quantity} kg`)

  // 8. Verify Ledger
  const ledger = await prisma.stockLedgerEntry.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: 'asc' }
  })
  console.log('\n--- LEDGER ENTRIES ---')
  ledger.forEach(l => {
    console.log(`${l.operationType} | Change: ${l.quantityChange} | New: ${l.newQuantity}`)
  })
  
  const finalStock = destBalance?.quantity
  if (finalStock === 77) {
    console.log('\n✅ GOLDEN TEST PASSED: Final stock is exactly 77 kg.')
  } else {
    console.error(`\n❌ GOLDEN TEST FAILED: Expected 77, got ${finalStock}`)
  }
}

runGoldenTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
