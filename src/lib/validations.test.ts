import { describe, it, expect } from 'vitest'
import {
  signupSchema,
  loginSchema,
  productSchema,
  receiptSchema,
  deliverySchema,
  transferSchema,
  adjustmentSchema,
} from './validations'

describe('Validation Schemas', () => {
  describe('signupSchema', () => {
    it('validates correct signup data', () => {
      const result = signupSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
        role: 'INVENTORY_MANAGER',
      })
      expect(result.success).toBe(true)
    })

    it('rejects mismatched passwords', () => {
      const result = signupSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Different123',
        role: 'INVENTORY_MANAGER',
      })
      expect(result.success).toBe(false)
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain('Passwords do not match')
    })

    it('rejects short password', () => {
      const result = signupSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Short1',
        confirmPassword: 'Short1',
        role: 'INVENTORY_MANAGER',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email', () => {
      const result = signupSchema.safeParse({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'Password123',
        confirmPassword: 'Password123',
        role: 'INVENTORY_MANAGER',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('validates correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'john@example.com',
        password: 'Password123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'Password123',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('productSchema', () => {
    it('validates correct product data', () => {
      const result = productSchema.safeParse({
        name: 'Steel Rods',
        sku: 'STL-001',
        categoryId: 'cat-123',
        unitOfMeasure: 'kg',
        reorderLevel: 20,
        initialStock: 0,
        description: 'High-grade steel rods',
        isActive: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid SKU format', () => {
      const result = productSchema.safeParse({
        name: 'Steel Rods',
        sku: 'stl-001', // lowercase
        categoryId: 'cat-123',
        unitOfMeasure: 'kg',
        reorderLevel: 20,
        initialStock: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative reorder level', () => {
      const result = productSchema.safeParse({
        name: 'Steel Rods',
        sku: 'STL-001',
        categoryId: 'cat-123',
        unitOfMeasure: 'kg',
        reorderLevel: -5,
        initialStock: 0,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('receiptSchema', () => {
    it('validates correct receipt data', () => {
      const result = receiptSchema.safeParse({
        supplierId: 'sup-123',
        warehouseId: 'wh-123',
        locationId: 'loc-123',
        date: '2024-01-15',
        notes: 'Test receipt',
        items: [
          { productId: 'prod-123', quantity: 100, unit: 'kg' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty items', () => {
      const result = receiptSchema.safeParse({
        supplierId: 'sup-123',
        warehouseId: 'wh-123',
        locationId: 'loc-123',
        items: [],
      })
      expect(result.success).toBe(false)
      expect(result.error.flatten().fieldErrors.items).toContain('At least one item is required')
    })

    it('rejects negative quantity', () => {
      const result = receiptSchema.safeParse({
        supplierId: 'sup-123',
        warehouseId: 'wh-123',
        locationId: 'loc-123',
        items: [{ productId: 'prod-123', quantity: -10, unit: 'kg' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('deliverySchema', () => {
    it('validates correct delivery data', () => {
      const result = deliverySchema.safeParse({
        customerName: 'Acme Corp',
        warehouseId: 'wh-123',
        locationId: 'loc-123',
        date: '2024-01-15',
        notes: 'Test delivery',
        items: [
          { productId: 'prod-123', quantity: 50, unit: 'kg' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing customer name', () => {
      const result = deliverySchema.safeParse({
        customerName: '',
        warehouseId: 'wh-123',
        locationId: 'loc-123',
        items: [{ productId: 'prod-123', quantity: 50, unit: 'kg' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('transferSchema', () => {
    it('validates correct transfer data', () => {
      const result = transferSchema.safeParse({
        fromWarehouseId: 'wh-1',
        fromLocationId: 'loc-1',
        toWarehouseId: 'wh-2',
        toLocationId: 'loc-2',
        date: '2024-01-15',
        notes: 'Test transfer',
        items: [
          { productId: 'prod-123', quantity: 30, unit: 'kg' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects same source and destination', () => {
      const result = transferSchema.safeParse({
        fromWarehouseId: 'wh-1',
        fromLocationId: 'loc-1',
        toWarehouseId: 'wh-1',
        toLocationId: 'loc-1',
        items: [{ productId: 'prod-123', quantity: 30, unit: 'kg' }],
      })
      expect(result.success).toBe(false)
      expect(result.error.flatten().fieldErrors.toLocationId).toContain('Source and destination cannot be the same')
    })
  })

  describe('adjustmentSchema', () => {
    it('validates correct adjustment data', () => {
      const result = adjustmentSchema.safeParse({
        productId: 'prod-123',
        locationId: 'loc-123',
        recordedQty: 100,
        countedQty: 97,
        date: '2024-01-15',
        notes: 'Physical count adjustment',
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative recorded quantity', () => {
      const result = adjustmentSchema.safeParse({
        productId: 'prod-123',
        locationId: 'loc-123',
        recordedQty: -10,
        countedQty: 97,
      })
      expect(result.success).toBe(false)
    })
  })
})