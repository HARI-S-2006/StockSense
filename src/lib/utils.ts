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

export function generateOTP(length: number = 6): string {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0')
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

export function getOperationTypeColor(type: string): string {
  switch (type) {
    case 'RECEIPT':
      return 'bg-blue-100 text-blue-800'
    case 'DELIVERY':
      return 'bg-green-100 text-green-800'
    case 'TRANSFER':
      return 'bg-purple-100 text-purple-800'
    case 'ADJUSTMENT':
      return 'bg-orange-100 text-orange-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getDocumentStatusColor(status: string | undefined): string {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-800'
    case 'WAITING':
      return 'bg-yellow-100 text-yellow-800'
    case 'READY':
      return 'bg-blue-100 text-blue-800'
    case 'DONE':
      return 'bg-emerald-100 text-emerald-800'
    case 'CANCELED':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}