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
import { Package, Plus, Search, Filter, Edit, Trash2, Eye, Loader2, Truck, ArrowRightLeft, RotateCcw, AlertTriangle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transferSchema, type TransferInput } from '@/lib/validations'
import { cn, formatNumber, getDocumentStatusColor, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface Transfer {
  id: string
  transferNumber: string
  fromWarehouseId: string
  fromWarehouse: { id: string; name: string; code: string }
  fromLocationId: string
  fromLocation: { id: string; name: string; code: string }
  toWarehouseId: string
  toWarehouse: { id: string; name: string; code: string }
  toLocationId: string
  toLocation: { id: string; name: string; code: string }
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

interface TransfersResponse {
  success: boolean
  data: Transfer[]
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

export default function TransfersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState('')
  const [toWarehouseFilter, setToWarehouseFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const transfersQueryFn = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (fromWarehouseFilter) params.set('fromWarehouseId', fromWarehouseFilter)
    if (toWarehouseFilter) params.set('toWarehouseId', toWarehouseFilter)
    params.set('page', page.toString())
    params.set('limit', '20')
    const url = "/api/transfers?" + params.toString()
    const res = await fetch(url)
    return res.json()
  }

  const { data: transfersResponse, isLoading } = useQuery({
    queryKey: ['transfers', { search, statusFilter, fromWarehouseFilter, toWarehouseFilter, page }],
    queryFn: transfersQueryFn,
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

  const createMutation = useMutation({
    mutationFn: async (data: TransferInput) => {
      const url = '/api/transfers'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      toast({ title: 'Success', description: 'Internal transfer created successfully' })
      setIsCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/transfers/${id}/validate`
      const res = await fetch(url, { method: 'POST' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      toast({ title: 'Success', description: 'Transfer validated successfully. Stock moved between locations.' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/transfers/${id}/cancel`
      const res = await fetch(url, { method: 'POST' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] })
      toast({ title: 'Success', description: 'Transfer canceled successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createForm = useForm<any>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromWarehouseId: '',
      fromLocationId: '',
      toWarehouseId: '',
      toLocationId: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [{ productId: '', quantity: 1, unit: 'pcs' }],
    },
  })

  const handleCreateSubmit = createForm.handleSubmit((data: any) => createMutation.mutate(data))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Internal Transfers</h1>
          <p className="text-muted-foreground">Move stock between locations and warehouses</p>
        </div>
        <Button onClick={() => { createForm.reset(); setIsCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Transfer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transfers..."
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
            <Select value={fromWarehouseFilter} onValueChange={(v) => { setFromWarehouseFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="From Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Warehouses</SelectItem>
                {warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={toWarehouseFilter} onValueChange={(v) => { setToWarehouseFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="To Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Warehouses</SelectItem>
                {warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading transfers...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transfer #</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfersResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No transfers found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transfersResponse?.data?.map((transfer: { id: string; transferNumber: string; fromWarehouse?: { name: string }; fromLocation?: { name: string }; toWarehouse?: { name: string }; toLocation?: { name: string }; status: string; date: string; items: Array<{ productId: string }> }) => (
                        <TableRow key={transfer.id}>
                          <TableCell><code className="text-sm">{transfer.transferNumber}</code></TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{transfer.fromWarehouse?.name}</p>
                              <p className="text-sm text-muted-foreground">{transfer.fromLocation?.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{transfer.toWarehouse?.name}</p>
                              <p className="text-sm text-muted-foreground">{transfer.toLocation?.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(transfer.date)}</TableCell>
                          <TableCell>
                            <Badge variant={transfer.status === 'DONE' ? 'success' : transfer.status === 'CANCELED' ? 'destructive' : 'default'}>
                              {transfer.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{transfer.items.length}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/operations/transfers/${transfer.id}`}><Eye className="h-4 w-4" /></Link>
                              </Button>
                              {transfer.status === 'READY' && (
                                <Button variant="ghost" size="icon" onClick={() => validateMutation.mutate(transfer.id)}>
                                  <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                              )}
                              {['DRAFT', 'WAITING', 'READY'].includes(transfer.status) && (
                                <Button variant="ghost" size="icon" onClick={() => { if (confirm('Cancel this transfer?')) cancelMutation.mutate(transfer.id) }}>
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
              {transfersResponse && transfersResponse.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {transfersResponse.pagination.page} of {transfersResponse.pagination.totalPages} • {transfersResponse.pagination.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(transfersResponse.pagination.totalPages, p + 1))} disabled={page === transfersResponse.pagination.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Transfer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Internal Transfer</DialogTitle>
            <DialogDescription>Move stock between locations or warehouses</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={createForm.control} name="fromWarehouseId" render={({ field }) => (
                  <FormItem><FormLabel>Source Warehouse</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select source warehouse" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="toWarehouseId" render={({ field }) => (
                  <FormItem><FormLabel>Destination Warehouse</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select destination warehouse" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={createForm.control} name="fromLocationId" render={({ field }) => (
                  <FormItem><FormLabel>Source Location</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select source location" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {warehousesResponse?.data?.flatMap((w: { id: string; name: string; locations?: Array<{ id: string; name: string }> }) => w.locations?.map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{w.name} - {l.name}</SelectItem>)) || []}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="toLocationId" render={({ field }) => (
                  <FormItem><FormLabel>Destination Location</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select destination location" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {warehousesResponse?.data?.flatMap((w: { id: string; name: string; locations?: Array<{ id: string; name: string }> }) => w.locations?.map((l: { id: string; name: string }) => <SelectItem key={l.id} value={l.id}>{w.name} - {l.name}</SelectItem>)) || []}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={createForm.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={createForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Input placeholder="Optional notes" {...field} /></FormControl><FormMessage /></FormItem>
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
                {createForm.getValues('items').map((item: { productId: string; quantity: number; unit: string }, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <FormField control={createForm.control} name={`items.${index}.productId`} render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select product" /></SelectTrigger>
                        <SelectContent>
                          {productsResponse?.data?.map((p: { id: string; name: string; sku: string }) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                    <FormField control={createForm.control} name={`items.${index}.quantity`} render={({ field }) => (
                      <FormControl><Input type="number" min="1" className="w-[100px]" {...field} /></FormControl>
                    )} />
                    <FormField control={createForm.control} name={`items.${index}.unit`} render={({ field }) => (
                      <FormControl><Input className="w-[80px]" {...field} /></FormControl>
                    )} />
                    <Button variant="ghost" size="icon" type="button" onClick={() => {
                      const items = createForm.getValues('items')
                      if (items.length > 1) {
                        createForm.setValue('items', items.filter((_: { productId: string; quantity: number; unit: string }, i: number) => i !== index))
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createMutation.isPending}>Create Transfer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}