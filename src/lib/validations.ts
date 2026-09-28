import { z } from 'zod'

// Auth schemas
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['INVENTORY_MANAGER', 'WAREHOUSE_STAFF']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  oobCode: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// Product schemas
export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters').regex(/^[A-Z0-9-]+$/, 'SKU must be uppercase alphanumeric with hyphens'),
  categoryId: z.string().min(1, 'Category is required'),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  reorderLevel: z.number().int().min(0, 'Reorder level must be non-negative'),
  initialStock: z.number().int().min(0, 'Initial stock must be non-negative'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const productUpdateSchema = productSchema.partial()

// Category schemas
export const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
})

// Warehouse schemas
export const warehouseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with hyphens'),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const locationSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with hyphens'),
  isActive: z.boolean().default(true),
})

// Supplier schemas
export const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').regex(/^[A-Z0-9-]+$/, 'Code must be uppercase alphanumeric with hyphens'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
  isActive: z.boolean().default(true),
})

// Receipt schemas
export const receiptItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
})

export const receiptSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  locationId: z.string().min(1, 'Location is required'),
  date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(receiptItemSchema).min(1, 'At least one item is required'),
})

export const receiptUpdateSchema = receiptSchema.partial()

// Delivery schemas
export const deliveryItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
})

export const deliverySchema = z.object({
  customerName: z.string().min(2, 'Customer name is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  locationId: z.string().min(1, 'Location is required'),
  date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(deliveryItemSchema).min(1, 'At least one item is required'),
})

export const deliveryUpdateSchema = deliverySchema.partial()

// Transfer schemas
export const transferItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
})

export const transferSchema = z.object({
  fromWarehouseId: z.string().min(1, 'Source warehouse is required'),
  fromLocationId: z.string().min(1, 'Source location is required'),
  toWarehouseId: z.string().min(1, 'Destination warehouse is required'),
  toLocationId: z.string().min(1, 'Destination location is required'),
  date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(transferItemSchema).min(1, 'At least one item is required'),
}).refine((data) => {
  if (data.fromWarehouseId === data.toWarehouseId && data.fromLocationId === data.toLocationId) {
    return false
  }
  return true
}, {
  message: 'Source and destination cannot be the same',
  path: ['toLocationId'],
})

// Adjustment schemas
export const adjustmentItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  recordedQty: z.number().int().min(0, 'Recorded quantity must be non-negative'),
  countedQty: z.number().int().min(0, 'Counted quantity must be non-negative'),
})

export const adjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().min(1, 'Location is required'),
  recordedQty: z.number().int().min(0, 'Recorded quantity must be non-negative'),
  countedQty: z.number().int().min(0, 'Counted quantity must be non-negative'),
  date: z.string().optional(),
  notes: z.string().optional(),
})

// Dashboard filter schemas
export const dashboardFiltersSchema = z.object({
  documentType: z.enum(['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT', 'ALL']).optional(),
  status: z.enum(['DRAFT', 'WAITING', 'READY', 'DONE', 'CANCELED', 'ALL']).optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
  categoryId: z.string().optional(),
  productId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

// Ledger filter schemas
export const ledgerFiltersSchema = z.object({
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  locationId: z.string().optional(),
  operationType: z.enum(['RECEIPT', 'DELIVERY', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'ALL']).optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50),
})

// Type exports
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ProductInput = z.infer<typeof productSchema>
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type WarehouseInput = z.infer<typeof warehouseSchema>
export type LocationInput = z.infer<typeof locationSchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type ReceiptInput = z.infer<typeof receiptSchema>
export type ReceiptUpdateInput = z.infer<typeof receiptUpdateSchema>
export type DeliveryInput = z.infer<typeof deliverySchema>
export type DeliveryUpdateInput = z.infer<typeof deliveryUpdateSchema>
export type TransferInput = z.infer<typeof transferSchema>
export type AdjustmentInput = z.infer<typeof adjustmentSchema>
export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) return false
  if (data.newPassword && data.newPassword !== data.confirmPassword) return false
  return true
}, {
  message: 'Password confirmation does not match or current password is missing',
  path: ['confirmPassword'],
})

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>
export type LedgerFilters = z.infer<typeof ledgerFiltersSchema>
export type ProfileInput = z.infer<typeof profileSchema>