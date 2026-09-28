'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Package, Plus, Search, Filter, Edit, Trash2, Eye, Loader2, AlertTriangle, RotateCcw, Minus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { adjustmentSchema, type AdjustmentInput } from '@/lib/validations'
import { cn, formatNumber, getDocumentStatusColor, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface Adjustment {
  id: string
  adjustmentNumber: string
  productId: string
  product: { id: string; name: string; sku: string; unitOfMeasure: string }
  locationId: string
  location: { id: string; name: string; code: string; warehouse: { id: string; name: string } }
  recordedQty: number
  countedQty: number
  difference: number
  status: string
  date: string
  notes: string | null
  createdById: string
  createdBy: { id: string; name: string }
  appliedById: string | null
  appliedBy: { id: string; name: string } | null
  appliedAt: string | null
  items: Array<{
    id: string
    productId: string
    product: { id: string; name: string; sku: string; unitOfMeasure: string }
    recordedQty: number
    countedQty: number
    difference: number
  }>
  createdAt: string
  updatedAt: string
}

interface AdjustmentsResponse {
  success: boolean
  data: Adjustment[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface Product {
  id: string
  name: string
  sku: string
  unitOfMeasure: string
}

export default function AdjustmentsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const adjustmentsQueryFn = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (locationFilter) params.set('locationId', locationFilter)
    if (productFilter) params.set('productId', productFilter)
    params.set('page', page.toString())
    params.set('limit', '20')
    const url = "/api/adjustments?" + params.toString()
    const res = await fetch(url)
    return res.json()
  }

  const { data: adjustmentsResponse, isLoading } = useQuery({
    queryKey: ['adjustments', { search, statusFilter, locationFilter, productFilter, page }],
    queryFn: adjustmentsQueryFn,
  })

  const productsQueryFn = async () => {
    const url = '/api/products?isActive=true&limit=100'
    const res = await fetch(url)
    return res.json()
  }

  const { data: productsResponse } = useQuery({
    queryKey: ['products'],
    queryFn: productsQueryFn,
  })

  const locationsQueryFn = async () => {
    const url = '/api/locations'
    const res = await fetch(url)
    return res.json()
  }

  const { data: locationsResponse } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsQueryFn,
  })

  const createMutation = useMutation({
    mutationFn: async (data: AdjustmentInput) => {
      const url = '/api/adjustments'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      toast({ title: 'Success', description: 'Inventory adjustment created successfully' })
      setIsCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const applyMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/adjustments/${id}/apply`
      const res = await fetch(url, { method: 'POST' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      toast({ title: 'Success', description: 'Adjustment applied successfully. Stock updated.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/adjustments/${id}/cancel`
      const res = await fetch(url, { method: 'POST' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      toast({ title: 'Success', description: 'Adjustment canceled successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createForm = useForm<any>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: '',
      locationId: '',
      recordedQty: 0,
      countedQty: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  const handleCreateSubmit = createForm.handleSubmit((data) => createMutation.mutate(data))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Adjustments</h1>
          <p className="text-muted-foreground">Reconcile physical stock with recorded stock</p>
        </div>
        <Button onClick={() => { createForm.reset(); setIsCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Adjustment
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search adjustments..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locationsResponse?.data?.map((l: { id: string; name: string; warehouse?: { name: string } }) => <SelectItem key={l.id} value={l.id}>{l.warehouse?.name} - {l.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={(v) => { setProductFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Products</SelectItem>
                {productsResponse?.data?.map((p: { id: string; name: string; sku: string }) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments Table */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading adjustments...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adjustment #</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Recorded</TableHead>
                      <TableHead>Counted</TableHead>
                      <TableHead>Difference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentsResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No adjustments found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      adjustmentsResponse?.data?.map((adjustment: { id: string; adjustmentNumber: string; product?: { name: string }; location?: { warehouse?: { name: string }; name: string }; recordedQty: number; countedQty: number; difference: number; status: string }) => (
                        <TableRow key={adjustment.id}>
                          <TableCell><code className="text-sm">{adjustment.adjustmentNumber}</code></TableCell>
                          <TableCell>{adjustment.product?.name}</TableCell>
                          <TableCell>{adjustment.location?.warehouse?.name} - {adjustment.location?.name}</TableCell>
                          <TableCell>{formatNumber(adjustment.recordedQty)}</TableCell>
                          <TableCell>{formatNumber(adjustment.countedQty)}</TableCell>
                          <TableCell className={cn('font-medium', adjustment.difference > 0 ? 'text-green-600' : adjustment.difference < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                            {adjustment.difference > 0 ? '+' : ''}{formatNumber(adjustment.difference)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={adjustment.status === 'DONE' ? 'success' : adjustment.status === 'CANCELED' ? 'destructive' : 'default'}>
                              {adjustment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/operations/adjustments/${adjustment.id}`}><Eye className="h-4 w-4" /></Link>
                              </Button>
                              {adjustment.status === 'READY' && (
                                <Button variant="ghost" size="icon" onClick={() => applyMutation.mutate(adjustment.id)}>
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                              )}
                              {['DRAFT', 'WAITING', 'READY'].includes(adjustment.status) && (
                                <Button variant="ghost" size="icon" onClick={() => { if (confirm('Cancel this adjustment?')) cancelMutation.mutate(adjustment.id) }}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {adjustmentsResponse && adjustmentsResponse.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {adjustmentsResponse.pagination.page} of {adjustmentsResponse.pagination.totalPages} • {adjustmentsResponse.pagination.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(adjustmentsResponse.pagination.totalPages, p + 1))} disabled={page === adjustmentsResponse.pagination.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Adjustment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Inventory Adjustment</DialogTitle>
            <DialogDescription>Reconcile physical stock with recorded stock</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
              <FormField control={createForm.control} name="productId" render={({ field }) => (
                <FormItem><FormLabel>Product</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger></FormControl>
                  <SelectContent>
{productsResponse?.data?.map((p: { id: string; name: string; sku: string }) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={createForm.control} name="locationId" render={({ field }) => (
                <FormItem><FormLabel>Location</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                  <SelectContent>
{locationsResponse?.data?.map((l: { id: string; name: string; warehouse?: { name: string } }) => <SelectItem key={l.id} value={l.id}>{l.warehouse?.name} - {l.name}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={createForm.control} name="recordedQty" render={({ field }) => (
                  <FormItem><FormLabel>Recorded Quantity</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="countedQty" render={({ field }) => (
                  <FormItem><FormLabel>Physical Count</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={createForm.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={createForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Optional notes" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createMutation.isPending}>Create Adjustment</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}