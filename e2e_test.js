const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function runE2E() {
  console.log("=========================================")
  console.log("🚀 STARTING E2E INVENTORY DEMO TEST")
  console.log("=========================================")

  try {
    // 1. Setup Data
    console.log("1️⃣ Seeding Master Data...")
    const category = await prisma.category.upsert({ where: { name: 'Demo Category' }, update: {}, create: { name: 'Demo Category' } })
    const supplier = await prisma.supplier.upsert({ where: { code: 'SUP-01' }, update: {}, create: { name: 'Demo Supplier', code: 'SUP-01' } })
    const warehouseA = await prisma.warehouse.upsert({ where: { code: 'WH-A' }, update: {}, create: { name: 'Warehouse A', code: 'WH-A' } })
    const warehouseB = await prisma.warehouse.upsert({ where: { code: 'WH-B' }, update: {}, create: { name: 'Warehouse B', code: 'WH-B' } })
    const locA = await prisma.location.upsert({ where: { warehouseId_code: { warehouseId: warehouseA.id, code: 'LOC-A1' } }, update: {}, create: { name: 'A1', code: 'LOC-A1', warehouseId: warehouseA.id } })
    const locB = await prisma.location.upsert({ where: { warehouseId_code: { warehouseId: warehouseB.id, code: 'LOC-B1' } }, update: {}, create: { name: 'B1', code: 'LOC-B1', warehouseId: warehouseB.id } })
    const user = await prisma.user.findFirst() || await prisma.user.create({ data: { name: 'Admin', email: 'admin@demo.com', password: 'hash', role: 'INVENTORY_MANAGER' } })

    const product = await prisma.product.upsert({
      where: { sku: 'DEMO-123' },
      update: {},
      create: { name: 'Demo Product', sku: 'DEMO-123', categoryId: category.id, unitOfMeasure: 'PCS', initialStock: 0, reorderLevel: 10 }
    })

    // 2. Receive 100
    const ts = Date.now()
    console.log(`\n2️⃣ EXECUTING: Receive 100 into WH-A / LOC-A1 (${ts})`)
    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber: `RC-DEMO-${ts}`,
        supplierId: supplier.id,
        warehouseId: warehouseA.id,
        locationId: locA.id,
        status: 'READY',
        createdById: user.id,
        items: { create: [{ productId: product.id, quantity: 100, unit: 'PCS' }] }
      }
    })
    
    // Simulate validate route logic
    const { validateReceipt, validateTransfer, validateDelivery, applyAdjustment } = require('./src/lib/inventory-engine')
    const receiptRes = await validateReceipt(receipt.id, user.id)
    if (!receiptRes.success) throw new Error("Receipt Failed: " + receiptRes.message)
    console.log("✅ Received 100")

    // 3. Transfer 100
    console.log("\n3️⃣ EXECUTING: Transfer 100 from WH-A to WH-B")
    const transfer = await prisma.internalTransfer.create({
      data: {
        transferNumber: `TR-DEMO-${ts}`,
        fromWarehouseId: warehouseA.id,
        fromLocationId: locA.id,
        toWarehouseId: warehouseB.id,
        toLocationId: locB.id,
        status: 'READY',
        createdById: user.id,
        items: { create: [{ productId: product.id, quantity: 100, unit: 'PCS' }] }
      }
    })
    const transferRes = await validateTransfer(transfer.id, user.id)
    if (!transferRes.success) throw new Error("Transfer Failed: " + transferRes.message)
    console.log("✅ Transferred 100")

    // 4. Deliver 20
    console.log("\n4️⃣ EXECUTING: Deliver 20 from WH-B")
    const delivery = await prisma.deliveryOrder.create({
      data: {
        deliveryNumber: `DO-DEMO-${ts}`,
        customerName: 'Demo Customer',
        warehouseId: warehouseB.id,
        locationId: locB.id,
        status: 'READY',
        createdById: user.id,
        items: { create: [{ productId: product.id, quantity: 20, unit: 'PCS' }] }
      }
    })
    const deliveryRes = await validateDelivery(delivery.id, user.id)
    if (!deliveryRes.success) throw new Error("Delivery Failed: " + deliveryRes.message)
    console.log("✅ Delivered 20")

    // 5. Adjust -3
    console.log("\n5️⃣ EXECUTING: Adjust -3 in WH-B")
    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        adjustmentNumber: `ADJ-DEMO-${ts}`,
        locationId: locB.id,
        productId: product.id,
        recordedQty: 77,
        countedQty: 80,
        difference: -3,
        notes: 'Damage',
        status: 'READY',
        createdById: user.id
      }
    })
    const adjustRes = await applyAdjustment(adjustment.id, user.id)
    if (!adjustRes.success) throw new Error("Adjust Failed: " + adjustRes.message)
    console.log("✅ Adjusted -3")

    // 6. Verification
    console.log("\n6️⃣ VERIFYING FINAL STOCK")
    const finalStock = await prisma.stockBalance.findFirst({
      where: { productId: product.id, locationId: locB.id }
    })
    
    console.log(`Expected: 77`)
    console.log(`Actual: ${finalStock.quantity}`)
    
    if (finalStock.quantity === 77) {
      console.log("🎉 SUCCESS: Inventory Engine calculates perfectly!")
    } else {
      console.log("❌ FAILED: Discrepancy found.")
    }

  } catch (error) {
    console.error("❌ ERROR:", error)
  } finally {
    await prisma.$disconnect()
  }
}

runE2E()
