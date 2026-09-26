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
    const locA = await prisma.location.upsert({ where: { code: 'LOC-A1' }, update: {}, create: { name: 'A1', code: 'LOC-A1', warehouseId: warehouseA.id } })
    const locB = await prisma.location.upsert({ where: { code: 'LOC-B1' }, update: {}, create: { name: 'B1', code: 'LOC-B1', warehouseId: warehouseB.id } })
    const user = await prisma.user.findFirst() || await prisma.user.create({ data: { name: 'Admin', email: 'admin@demo.com', password: 'hash', role: 'INVENTORY_MANAGER' } })

    const product = await prisma.product.upsert({
      where: { sku: 'DEMO-123' },
      update: {},
      create: { name: 'Demo Product', sku: 'DEMO-123', categoryId: category.id, unitOfMeasure: 'PCS', initialStock: 0, reorderLevel: 10 }
    })

    // 2. Receive 100
    console.log("\n2️⃣ EXECUTING: Receive 100 into WH-A / LOC-A1")
    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber: 'RC-DEMO-001',
        supplierId: supplier.id,
        warehouseId: warehouseA.id,
        locationId: locA.id,
        status: 'DRAFT',
        createdById: user.id,
        items: { create: [{ productId: product.id, quantity: 100, unit: 'PCS' }] }
      }
    })
    
    // Simulate validate route logic
    const { InventoryEngine } = require('./src/lib/inventory-engine')
    await InventoryEngine.processReceipt(receipt.id, user.id)
    console.log("✅ Received 100")

    // 3. Transfer 100
    console.log("\n3️⃣ EXECUTING: Transfer 100 from WH-A to WH-B")
    const transfer = await prisma.internalTransfer.create({
      data: {
        transferNumber: 'TR-DEMO-001',
        fromWarehouseId: warehouseA.id,
        fromLocationId: locA.id,
        toWarehouseId: warehouseB.id,
        toLocationId: locB.id,
        status: 'DRAFT',
        createdById: user.id,
        items: { create: [{ productId: product.id, quantity: 100, unit: 'PCS' }] }
      }
    })
    await InventoryEngine.processTransfer(transfer.id, user.id)
    console.log("✅ Transferred 100")

    // 4. Deliver 20
    console.log("\n4️⃣ EXECUTING: Deliver 20 from WH-B")
    const delivery = await prisma.deliveryOrder.create({
      data: {
        deliveryNumber: 'DO-DEMO-001',
        customerName: 'Demo Customer',
        warehouseId: warehouseB.id,
        locationId: locB.id,
        status: 'DRAFT',
        createdById: user.id,
        items: { create: [{ productId: product.id, quantity: 20, unit: 'PCS' }] }
      }
    })
    await InventoryEngine.processDelivery(delivery.id, user.id)
    console.log("✅ Delivered 20")

    // 5. Adjust -3
    console.log("\n5️⃣ EXECUTING: Adjust -3 in WH-B")
    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        adjustmentNumber: 'ADJ-DEMO-001',
        warehouseId: warehouseB.id,
        locationId: locB.id,
        reason: 'Damage',
        status: 'DRAFT',
        createdById: user.id,
        items: { create: [{ productId: product.id, expectedQty: 80, recordedQty: 77, difference: -3 }] }
      }
    })
    await InventoryEngine.processAdjustment(adjustment.id, user.id)
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
