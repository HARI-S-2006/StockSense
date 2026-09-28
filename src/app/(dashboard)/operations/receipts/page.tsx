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
import { Package, Plus, Search, Filter, Edit, Trash2, Eye, Loader2, Truck, Box } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { receiptSchema, type ReceiptInput } from '@/lib/validations'
import { cn, formatNumber, getDocumentStatusColor, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface Receipt {
  id: string
  receiptNumber: string
  supplierId: string
  supplier: { id: string; name: string; code: string }
  warehouseId: string
  warehouse: { id: string; name: string; code: string }
  locationId: string
  location: { id: string; name: string; code: string }
  status: string
  date: string
  notes: string | null
  createdById: string
  createdBy: { id: string; name: string }
  validatedById: string | null
  validatedBy: { id: string; name: string } | null
  validatedAt: string | null
  items: Array<{
    id: string
    productId: string
    product: { id: string; name: string; sku: string; unitOfMeasure: string }
    quantity: number
    unit: string
  }>
  createdAt: string
  updatedAt: string
}

interface ReceiptsResponse {
  success: boolean
  data: Receipt[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface Supplier {
  id: string
  name: string
  code: string
}

interface Product {
  id: string
  name: string
  sku: string
  unitOfMeasure: string
}

export default function ReceiptsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null)

  const receiptsQueryFn = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (warehouseFilter) params.set('warehouseId', warehouseFilter)
    if (supplierFilter) params.set('supplierId', supplierFilter)
    params.set('page', page.toString())
    params.set('limit', '20')
    const url = "/api/receipts?" + params.toString()
    const res = await fetch(url)
    return res.json()
  }

  const suppliersQueryFn = async () => {
    const url = '/api/suppliers'
    const res = await fetch(url)
    return res.json()
  }

  const { data: suppliersResponse } = useQuery({
    queryKey: ['suppliers'],
    queryFn: suppliersQueryFn,
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

  const warehousesQueryFn = async () => {
    const url = '/api/warehouses'
    const res = await fetch(url)
    return res.json()
  }

  const { data: warehousesResponse } = useQuery({
    queryKey: ['warehouses'],
    queryFn: warehousesQueryFn,
  })

  const { data: receiptsResponse, isLoading } = useQuery({
    queryKey: ['receipts', { search, statusFilter, warehouseFilter, supplierFilter, page }],
    queryFn: receiptsQueryFn,
  })

  const createMutation = useMutation({
    mutationFn: async (data: ReceiptInput) => {
      const url = '/api/receipts'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      toast({ title: 'Success', description: 'Receipt created successfully' })
      setIsCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/receipts/${id}/submit`
      const res = await fetch(url, { method: 'POST' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      toast({ title: 'Success', description: 'Receipt submitted for review' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/receipts/${id}/validate`
      const res = await fetch(url, { method: 'POST' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      toast({ title: 'Success', description: 'Receipt validated successfully. Stock increased.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/receipts/${id}/cancel`
      const res = await fetch(url, { method: 'POST' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      toast({ title: 'Success', description: 'Receipt canceled successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createForm = useForm<ReceiptInput>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      supplierId: '',
      warehouseId: '',
      locationId: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [{ productId: '', quantity: 1, unit: 'pcs' }],
    },
  })

  const handleCreateSubmit = createForm.handleSubmit((data) => createMutation.mutate(data))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground">Manage incoming stock from suppliers</p>
        </div>
        <Button onClick={() => { createForm.reset(); setIsCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Receipt
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search receipts..."
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
            <Select value={warehouseFilter} onValueChange={(v) => { setWarehouseFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Warehouses</SelectItem>
                {warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={(v) => { setSupplierFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Suppliers</SelectItem>
                {suppliersResponse?.data?.map((s: { id: string; name: string }) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading receipts...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptsResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No receipts found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      receiptsResponse?.data?.map((receipt: { id: string; receiptNumber: string; supplier?: { name: string }; warehouse?: { name: string }; location?: { name: string }; date: string; status: string; items: Array<{ productId: string }> }) => (
                        <TableRow key={receipt.id}>
                          <TableCell><code className="text-sm">{receipt.receiptNumber}</code></TableCell>
                          <TableCell>{receipt.supplier?.name}</TableCell>
                          <TableCell>{receipt.warehouse?.name}</TableCell>
                          <TableCell>{receipt.location?.name}</TableCell>
                          <TableCell>{formatDate(receipt.date)}</TableCell>
                          <TableCell>
                            <Badge variant={receipt.status === 'DONE' ? 'success' : receipt.status === 'CANCELED' ? 'destructive' : 'default'}>
                              {receipt.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{receipt.items.length}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/operations/receipts/${receipt.id}`}><Eye className="h-4 w-4" /></Link>
                              </Button>
                              {receipt.status === 'DRAFT' && (
                                <Button variant="ghost" size="icon" onClick={() => submitMutation.mutate(receipt.id)}>
                                  <Truck className="h-4 w-4" />
                                </Button>
                              )}
                              {receipt.status === 'READY' && (
                                <Button variant="ghost" size="icon" onClick={() => validateMutation.mutate(receipt.id)}>
                                  <Box className="h-4 w-4" />
                                </Button>
                              )}
                              {['DRAFT', 'WAITING', 'READY'].includes(receipt.status) && (
                                <Button variant="ghost" size="icon" onClick={() => { if (confirm('Cancel this receipt?')) cancelMutation.mutate(receipt.id) }}>
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
              {receiptsResponse && receiptsResponse.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {receiptsResponse.pagination.page} of {receiptsResponse.pagination.totalPages} • {receiptsResponse.pagination.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(receiptsResponse.pagination.totalPages, p + 1))} disabled={page === receiptsResponse.pagination.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Receipt Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Receipt</DialogTitle>
            <DialogDescription>Record incoming stock from a supplier</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={createForm.control} name="supplierId" render={({ field }) => (
                  <FormItem><FormLabel>Supplier</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value as string | undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl>
                    <SelectContent>
{suppliersResponse?.data?.map((s: { id: string; name: string }) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="warehouseId" render={({ field }) => (
                  <FormItem><FormLabel>Warehouse</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value as string | undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger></FormControl>
                    <SelectContent>
{warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={createForm.control} name="locationId" render={({ field }) => (
                  <FormItem><FormLabel>Destination Location</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value as string | undefined}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {warehousesResponse?.data?.flatMap((w: { id: string; name: string; locations?: Array<{ id: string; name: string }> }) => w.locations?.map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{w.name} - {l.name}</SelectItem>)) || []}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
<FormField control={createForm.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Optional notes" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Items</FormLabel>
                  <Button variant="outline" size="sm" type="button" onClick={() => {
                    createForm.setValue('items', [...createForm.getValues('items'), { productId: '', quantity: 1, unit: 'pcs' }])
                  }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </div>
                {createForm.getValues('items').map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FormField control={createForm.control} name={`items.${index}.productId`} render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value as string | undefined}>
                        <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {productsResponse?.data?.map((p: { id: string; name: string; sku: string }) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                    <FormField control={createForm.control} name={`items.${index}.quantity`} render={({ field }) => (
                      <FormControl><Input type="number" min="1" className="w-[100px]" {...field} value={field.value as number | string | undefined} onChange={field.onChange} /></FormControl>
                    )} />
                    <FormField control={createForm.control} name={`items.${index}.unit`} render={({ field }) => (
                      <FormControl><Input className="w-[80px]" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl>
                    )} />
                    <Button variant="ghost" size="icon" type="button" onClick={() => {
                      const items = createForm.getValues('items')
                      if (items.length > 1) {
                        createForm.setValue('items', items.filter((_, i) => i !== index))
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createMutation.isPending}>Create Receipt</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}