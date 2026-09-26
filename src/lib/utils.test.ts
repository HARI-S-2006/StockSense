import { describe, it, expect } from 'vitest'
import {
  cn,
  formatNumber,
  formatDate,
  formatRelativeTime,
  generateDocumentNumber,
  getStockStatusColor,
  getDocumentStatusColor,
  getOperationTypeColor,
  generateOTP,
  isValidEmail,
  slugify,
} from './utils'

describe('Utility Functions', () => {
  describe('cn', () => {
    it('combines class names', () => {
      expect(cn('base', 'extra')).toBe('base extra')
    })

    it('handles conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })

    it('handles empty input', () => {
      expect(cn()).toBe('')
    })
  })

  describe('formatNumber', () => {
    it('formats numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000')
      expect(formatNumber(1000000)).toBe('1,000,000')
      expect(formatNumber(42)).toBe('42')
    })
  })

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = formatDate(date)
      expect(formatted).toContain('Jan')
      expect(formatted).toContain('15')
      expect(formatted).toContain('2024')
    })
  })

  describe('formatRelativeTime', () => {
    it('returns "just now" for recent times', () => {
      const now = new Date()
      expect(formatRelativeTime(now)).toBe('just now')
    })

    it('returns minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago')
    })

    it('returns hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago')
    })

    it('returns days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago')
    })
  })

  describe('generateDocumentNumber', () => {
    it('generates unique document numbers', () => {
      const num1 = generateDocumentNumber('RCV')
      const num2 = generateDocumentNumber('RCV')
      expect(num1).toMatch(/^RCV-/)
      expect(num2).toMatch(/^RCV-/)
      expect(num1).not.toBe(num2)
    })
  })

  describe('getStockStatusColor', () => {
    it('returns correct colors for stock statuses', () => {
      expect(getStockStatusColor('IN_STOCK')).toBe('bg-green-100 text-green-800')
      expect(getStockStatusColor('LOW_STOCK')).toBe('bg-yellow-100 text-yellow-800')
      expect(getStockStatusColor('OUT_OF_STOCK')).toBe('bg-red-100 text-red-800')
      expect(getStockStatusColor('UNKNOWN')).toBe('bg-gray-100 text-gray-800')
    })
  })

  describe('getDocumentStatusColor', () => {
    it('returns correct colors for document statuses', () => {
      expect(getDocumentStatusColor('DRAFT')).toBe('bg-gray-100 text-gray-800')
      expect(getDocumentStatusColor('WAITING')).toBe('bg-blue-100 text-blue-800')
      expect(getDocumentStatusColor('READY')).toBe('bg-purple-100 text-purple-800')
      expect(getDocumentStatusColor('DONE')).toBe('bg-green-100 text-green-800')
      expect(getDocumentStatusColor('CANCELED')).toBe('bg-red-100 text-red-800')
    })
  })

  describe('getOperationTypeColor', () => {
    it('returns correct colors for operation types', () => {
      expect(getOperationTypeColor('RECEIPT')).toBe('bg-green-100 text-green-800')
      expect(getOperationTypeColor('DELIVERY')).toBe('bg-red-100 text-red-800')
      expect(getOperationTypeColor('TRANSFER_IN')).toBe('bg-blue-100 text-blue-800')
      expect(getOperationTypeColor('TRANSFER_OUT')).toBe('bg-orange-100 text-orange-800')
    })
  })

  describe('generateOTP', () => {
    it('generates 6-digit OTP', () => {
      const otp = generateOTP()
      expect(otp).toMatch(/^\d{6}$/)
    })

    it('generates different OTPs', () => {
      const otp1 = generateOTP()
      const otp2 = generateOTP()
      expect(otp1).not.toBe(otp2)
    })
  })

  describe('isValidEmail', () => {
    it('validates correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.org')).toBe(true)
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true)
    })

    it('rejects invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('missing@domain')).toBe(false)
      expect(isValidEmail('@nodomain.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('slugify', () => {
    it('creates URL-friendly slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world')
      expect(slugify('Product Name 123')).toBe('product-name-123')
      expect(slugify('Special!@#Characters')).toBe('specialcharacters')
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces')
    })
  })
})