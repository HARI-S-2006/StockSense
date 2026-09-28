'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Search, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { formatNumber, getOperationTypeColor, formatDateTime, formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

function getOperationTypeBadgeVariant(operationType: string): 'default' | 'outline' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' {
  switch (operationType) {
    case 'RECEIPT':
      return 'success'
    case 'DELIVERY':
      return 'destructive'
    case 'TRANSFER_IN':
    case 'TRANSFER_OUT':
      return 'info'
    case 'ADJUSTMENT_IN':
      return 'warning'
    case 'ADJUSTMENT_OUT':
      return 'warning'
    default:
      return 'default'
  }
}

interface LedgerEntry {
  id: string
  productId: string
  product: { id: string; name: string; sku: string; unitOfMeasure: string }
  warehouseId: string
  warehouse: { id: string; name: string; code: string }
  locationId: string
  location: { id: string; name: string; code: string }
  operationType: string
  documentType: string
  documentId: string
  documentNumber: string
  previousQuantity: number
  quantityChange: number
  newQuantity: number
  userId: string
  user: { id: string; name: string }
  notes: string | null
  createdAt: string
}

interface LedgerResponse {
  success: boolean
  data: LedgerEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function MoveHistoryPage() {
  const [search, setSearch] = useState('')
  const [operationFilter, setOperationFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const ledgerQueryFn = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (operationFilter) params.set('operationType', operationFilter)
    if (warehouseFilter) params.set('warehouseId', warehouseFilter)
    if (locationFilter) params.set('locationId', locationFilter)
    if (productFilter) params.set('productId', productFilter)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    params.set('page', page.toString())
    params.set('limit', '50')
    const url = "/api/ledger?" + params.toString()
    const res = await fetch(url)
    return res.json()
  }

  const { data: ledgerResponse, isLoading } = useQuery({
    queryKey: ['ledger', { search, operationFilter, warehouseFilter, locationFilter, productFilter, dateFrom, dateTo, page }],
    queryFn: ledgerQueryFn,
  })

  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products?isActive=true&limit=100')
      return res.json()
    },
  })

  const { data: warehousesResponse } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await fetch('/api/warehouses')
      return res.json()
    },
  })

  const { data: locationsResponse } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const res = await fetch('/api/locations')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Move History / Stock Ledger</h1>
          <p className="text-muted-foreground">Complete audit trail of all inventory movements</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search product, SKU, document #..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
              />
            </div>
            <Select value={operationFilter} onValueChange={(v) => { setOperationFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Operations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Operations</SelectItem>
                <SelectItem value="RECEIPT">Receipt</SelectItem>
                <SelectItem value="DELIVERY">Delivery</SelectItem>
                <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                <SelectItem value="ADJUSTMENT_IN">Adjustment In</SelectItem>
                <SelectItem value="ADJUSTMENT_OUT">Adjustment Out</SelectItem>
              </SelectContent>
            </Select>
            <Select value={warehouseFilter} onValueChange={(v) => { setWarehouseFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Warehouses</SelectItem>
                {warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locationsResponse?.data?.map((l: { id: string; name: string; warehouse?: { name: string } }) => <SelectItem key={l.id} value={l.id}>{l.warehouse?.name} - {l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-[160px]"
                placeholder="From"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-[160px]"
                placeholder="To"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading move history...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Document #</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Qty Change</TableHead>
                      <TableHead className="text-right">New Qty</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No inventory movements found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerResponse?.data?.map((entry: { id: string; createdAt: string; product: { name: string; sku: string }; operationType: string; documentNumber: string; warehouse: { name: string }; location: { name: string }; quantityChange: number; newQuantity: number; user: { name: string } }) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                          <TableCell>{entry.product.name}</TableCell>
                          <TableCell><code className="text-sm">{entry.product.sku}</code></TableCell>
                          <TableCell>
                            <Badge variant={getOperationTypeBadgeVariant(entry.operationType)}>
                              {entry.operationType}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.documentNumber}</TableCell>
                          <TableCell>{entry.warehouse.name}</TableCell>
                          <TableCell>{entry.location.name}</TableCell>
                          <TableCell className={cn('text-right font-medium', entry.quantityChange > 0 ? 'text-green-600' : entry.quantityChange < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                            {entry.quantityChange > 0 ? '+' : ''}{formatNumber(entry.quantityChange)}
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(entry.newQuantity)}</TableCell>
                          <TableCell>{entry.user.name}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {ledgerResponse && ledgerResponse.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {ledgerResponse.pagination.page} of {ledgerResponse.pagination.totalPages} • {ledgerResponse.pagination.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(ledgerResponse.pagination.totalPages, p + 1))} disabled={page === ledgerResponse.pagination.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}