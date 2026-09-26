import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return '0'
  return new Intl.NumberFormat('en-US').format(num)
}

export function getStockStatusColor(status: string | undefined): string {
  switch (status) {
    case 'IN_STOCK':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'LOW_STOCK':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'OUT_OF_STOCK':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function generateDocumentNumber(prefix: string): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${year}${month}-${random}`
}