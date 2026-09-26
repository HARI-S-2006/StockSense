import { PrismaClient, Role, DocumentStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean existing data (in development)
  await prisma.auditLog.deleteMany()
  await prisma.stockLedgerEntry.deleteMany()
  await prisma.stockBalance.deleteMany()
  await prisma.inventoryAdjustmentItem.deleteMany()
  await prisma.inventoryAdjustment.deleteMany()
  await prisma.internalTransferItem.deleteMany()
  await prisma.internalTransfer.deleteMany()
  await prisma.deliveryItem.deleteMany()
  await prisma.deliveryOrder.deleteMany()
  await prisma.receiptItem.deleteMany()
  await prisma.receipt.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.location.deleteMany()
  await prisma.warehouse.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.passwordResetOTP.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()

  console.log('🗑️  Cleared existing data')

  // Create Users
  const managerPassword = await hashPassword('Manager@123')
  const staffPassword = await hashPassword('Staff@123')

  const manager = await prisma.user.create({
    data: {
      name: 'Inventory Manager',
      email: 'manager@stocksense.com',
      passwordHash: managerPassword,
      role: Role.INVENTORY_MANAGER,
    },
  })

  const staff = await prisma.user.create({
    data: {
      name: 'Warehouse Staff',
      email: 'warehouse@stocksense.com',
      passwordHash: staffPassword,
      role: Role.WAREHOUSE_STAFF,
    },
  })

  console.log('👥 Created users:', manager.email, staff.email)

  // Create Categories
  const rawMaterials = await prisma.category.create({
    data: { name: 'Raw Materials', description: 'Raw materials for production', isActive: true },
  })
  const finishedGoods = await prisma.category.create({
    data: { name: 'Finished Goods', description: 'Finished products ready for sale', isActive: true },
  })
  const officeEquipment = await prisma.category.create({
    data: { name: 'Office Equipment', description: 'Office equipment and supplies', isActive: true },
  })

  console.log('📦 Created categories')

  // Create Warehouses
  const mainWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      code: 'MW-001',
      address: '123 Industrial Blvd, Manufacturing District',
      isActive: true,
    },
  })

  const secondaryWarehouse = await prisma.warehouse.create({
    data: {
      name: 'Secondary Warehouse',
      code: 'SW-001',
      address: '456 Logistics Way, Distribution Center',
      isActive: true,
    },
  })

  console.log('🏭 Created warehouses')

  // Create Locations for Main Warehouse
  const mainStore = await prisma.location.create({
    data: { warehouseId: mainWarehouse.id, name: 'Main Store', code: 'MS', isActive: true },
  })
  const rackA = await prisma.location.create({
    data: { warehouseId: mainWarehouse.id, name: 'Rack A', code: 'RA', isActive: true },
  })
  const rackB = await prisma.location.create({
    data: { warehouseId: mainWarehouse.id, name: 'Rack B', code: 'RB', isActive: true },
  })
  const productionRack = await prisma.location.create({
    data: { warehouseId: mainWarehouse.id, name: 'Production Rack', code: 'PR', isActive: true },
  })
  const dispatchArea = await prisma.location.create({
    data: { warehouseId: mainWarehouse.id, name: 'Dispatch Area', code: 'DA', isActive: true },
  })

  // Create Locations for Secondary Warehouse
  const swRackA = await prisma.location.create({
    data: { warehouseId: secondaryWarehouse.id, name: 'Rack A', code: 'RA', isActive: true },
  })
  const swDispatchArea = await prisma.location.create({
    data: { warehouseId: secondaryWarehouse.id, name: 'Dispatch Area', code: 'DA', isActive: true },
  })

  console.log('📍 Created locations')

  // Create Suppliers
  const abcMetals = await prisma.supplier.create({
    data: {
      name: 'ABC Metals',
      code: 'SUP-001',
      email: 'sales@abcmetals.com',
      phone: '+1-555-0100',
      address: '789 Steel Road, Metal City',
      contactPerson: 'John Steel',
      isActive: true,
    },
  })

  const chairCo = await prisma.supplier.create({
    data: {
      name: 'Chair Co.',
      code: 'SUP-002',
      email: 'orders@chairco.com',
      phone: '+1-555-0200',
      address: '321 Furniture Ave, Design District',
      contactPerson: 'Jane Sitwell',
      isActive: true,
    },
  })

  const techSupplies = await prisma.supplier.create({
    data: {
      name: 'Tech Supplies Inc.',
      code: 'SUP-003',
      email: 'procurement@techsupplies.com',
      phone: '+1-555-0300',
      address: '555 Innovation Drive, Tech Park',
      contactPerson: 'Bob Byte',
      isActive: true,
    },
  })

  console.log('🚚 Created suppliers')

  // Create Products
  const steelRods = await prisma.product.create({
    data: {
      name: 'Steel Rods',
      sku: 'STL-001',
      categoryId: rawMaterials.id,
      unitOfMeasure: 'kg',
      reorderLevel: 20,
      initialStock: 0,
      description: 'High-grade steel rods for construction',
      isActive: true,
    },
  })

  const officeChair = await prisma.product.create({
    data: {
      name: 'Office Chair',
      sku: 'CHR-001',
      categoryId: finishedGoods.id,
      unitOfMeasure: 'pcs',
      reorderLevel: 10,
      initialStock: 50,
      description: 'Ergonomic office chair with lumbar support',
      isActive: true,
    },
  })

  const woodenTable = await prisma.product.create({
    data: {
      name: 'Wooden Table',
      sku: 'TBL-001',
      categoryId: finishedGoods.id,
      unitOfMeasure: 'pcs',
      reorderLevel: 5,
      initialStock: 25,
      description: 'Solid oak conference table',
      isActive: true,
    },
  })

  const laptop = await prisma.product.create({
    data: {
      name: 'Laptop',
      sku: 'LPT-001',
      categoryId: officeEquipment.id,
      unitOfMeasure: 'pcs',
      reorderLevel: 5,
      initialStock: 15,
      description: 'Business laptop 15" with 16GB RAM',
      isActive: true,
    },
  })

  console.log('📦 Created products')

  // Initialize Stock Balances for products with initial stock
  const initialStockProducts = [
    { product: officeChair, location: mainStore, qty: 50 },
    { product: woodenTable, location: mainStore, qty: 25 },
    { product: laptop, location: mainStore, qty: 15 },
  ]

  for (const { product, location, qty } of initialStockProducts) {
    await prisma.stockBalance.create({
      data: {
        productId: product.id,
        warehouseId: location.warehouseId,
        locationId: location.id,
        quantity: qty,
      },
    })

    await prisma.stockLedgerEntry.create({
      data: {
        productId: product.id,
        warehouseId: location.warehouseId,
        locationId: location.id,
        operationType: 'ADJUSTMENT_IN',
        documentType: 'INITIAL_STOCK',
        documentId: 'seed',
        documentNumber: 'INIT-001',
        previousQuantity: 0,
        quantityChange: qty,
        newQuantity: qty,
        userId: manager.id,
        notes: 'Initial stock from seed data',
      },
    })
  }

  console.log('📊 Initialized stock balances and ledger')

  // Create a sample receipt for Steel Rods (for demo)
  const receipt = await prisma.receipt.create({
    data: {
      receiptNumber: 'RCV-0001',
      supplierId: abcMetals.id,
      warehouseId: mainWarehouse.id,
      locationId: mainStore.id,
      status: DocumentStatus.DONE,
      date: new Date(),
      notes: 'Initial steel delivery for demo',
      createdById: manager.id,
      validatedById: manager.id,
      validatedAt: new Date(),
      items: {
        create: {
          productId: steelRods.id,
          quantity: 100,
          unit: 'kg',
        },
      },
    },
  })

  // Update stock balance for steel rods
  await prisma.stockBalance.create({
    data: {
      productId: steelRods.id,
      warehouseId: mainWarehouse.id,
      locationId: mainStore.id,
      quantity: 100,
    },
  })

  await prisma.stockLedgerEntry.create({
    data: {
      productId: steelRods.id,
      warehouseId: mainWarehouse.id,
      locationId: mainStore.id,
      operationType: 'RECEIPT',
      documentType: 'RECEIPT',
      documentId: receipt.id,
      documentNumber: receipt.receiptNumber,
      previousQuantity: 0,
      quantityChange: 100,
      newQuantity: 100,
      userId: manager.id,
      notes: 'Received from ABC Metals',
    },
  })

  console.log('📥 Created sample receipt with stock update')

  console.log('✅ Seed completed successfully!')
  console.log('')
  console.log('📋 Demo Credentials:')
  console.log('   Manager: manager@stocksense.com / Manager@123')
  console.log('   Staff:   warehouse@stocksense.com / Staff@123')
  console.log('')
  console.log('🎯 Demo Scenario Ready:')
  console.log('   1. Steel Rods (STL-001): 100 kg at Main Store')
  console.log('   2. Office Chair (CHR-001): 50 pcs at Main Store')
  console.log('   3. Wooden Table (TBL-001): 25 pcs at Main Store')
  console.log('   4. Laptop (LPT-001): 15 pcs at Main Store')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })