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
import { Package, Plus, Search, Filter, Edit, Trash2, Eye, Loader2, Warehouse, MapPin, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { warehouseSchema, locationSchema, type WarehouseInput, type LocationInput } from '@/lib/validations'
import { cn, formatNumber } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface Warehouse {
  id: string
  name: string
  code: string
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  locations: Location[]
  _count: { locations: number }
}

interface Location {
  id: string
  name: string
  code: string
  isActive: boolean
  warehouseId: string
  warehouse: { id: string; name: string }
  createdAt: string
  updatedAt: string
}

interface WarehousesResponse {
  success: boolean
  data: Warehouse[]
}

export default function WarehousesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateWarehouseDialogOpen, setIsCreateWarehouseDialogOpen] = useState(false)
  const [isCreateLocationDialogOpen, setIsCreateLocationDialogOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  const warehousesQueryFn = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page.toString())
    params.set('limit', '20')
    const url = "/api/warehouses?" + params.toString()
    const res = await fetch(url)
    return res.json()
  }

  const { data: warehousesResponse, isLoading } = useQuery({
    queryKey: ['warehouses', { search, page }],
    queryFn: warehousesQueryFn,
  })

  const createWarehouseMutation = useMutation({
    mutationFn: async (data: WarehouseInput) => {
      const url = '/api/warehouses'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast({ title: 'Success', description: 'Warehouse created successfully' })
      setIsCreateWarehouseDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createLocationMutation = useMutation({
    mutationFn: async (data: LocationInput) => {
      const url = '/api/locations'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast({ title: 'Success', description: 'Location created successfully' })
      setIsCreateLocationDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateWarehouseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WarehouseInput> }) => {
      const url = `/api/warehouses/${id}`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast({ title: 'Success', description: 'Warehouse updated successfully' })
      setEditingWarehouse(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/warehouses/${id}`
      const res = await fetch(url, { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast({ title: 'Success', description: 'Warehouse deleted successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const warehouseForm = useForm<WarehouseInput>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      isActive: true,
    },
  })

  const locationForm = useForm<LocationInput>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      warehouseId: '',
      name: '',
      code: '',
      isActive: true,
    },
  })

  const handleCreateWarehouseSubmit = warehouseForm.handleSubmit((data) => createWarehouseMutation.mutate(data))
  const handleCreateLocationSubmit = locationForm.handleSubmit((data) => createLocationMutation.mutate(data))
  const handleUpdateWarehouseSubmit = warehouseForm.handleSubmit((data) => updateWarehouseMutation.mutate({ id: editingWarehouse!.id, data }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouses & Locations</h1>
          <p className="text-muted-foreground">Manage warehouses and their locations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { locationForm.reset(); setIsCreateLocationDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
          <Button onClick={() => { warehouseForm.reset(); setIsCreateWarehouseDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search warehouses..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warehouses List */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading warehouses...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Locations</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehousesResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No warehouses found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      warehousesResponse?.data?.map((warehouse: { id: string; name: string; code: string; address: string | null; isActive: boolean; createdAt: string; updatedAt: string; locations: Array<{ id: string; name: string; code: string; isActive: boolean; warehouseId: string; warehouse: { id: string; name: string }; createdAt: string; updatedAt: string }>; _count: { locations: number } }) => (
                        <TableRow key={warehouse.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{warehouse.name}</p>
                              <p className="text-sm text-muted-foreground">{warehouse.code}</p>
                            </div>
                          </TableCell>
                          <TableCell><code className="text-sm">{warehouse.code}</code></TableCell>
                          <TableCell>{warehouse.address || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={warehouse.isActive ? 'success' : 'destructive'}>
                              {warehouse.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{warehouse._count.locations}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => { warehouseForm.reset({ name: warehouse.name, code: warehouse.code, address: warehouse.address ?? undefined, isActive: warehouse.isActive }); setEditingWarehouse(warehouse); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete this warehouse?')) deleteWarehouseMutation.mutate(warehouse.id) }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {warehousesResponse && warehousesResponse.length > 0 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil(warehousesResponse.length / 20)} • {warehousesResponse.length} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Warehouse Dialog */}
      <Dialog open={isCreateWarehouseDialogOpen} onOpenChange={setIsCreateWarehouseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Warehouse</DialogTitle>
            <DialogDescription>Add a new warehouse to your inventory system</DialogDescription>
          </DialogHeader>
          <Form {...warehouseForm}>
            <form onSubmit={handleCreateWarehouseSubmit} className="space-y-4 py-4">
              <FormField control={warehouseForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Warehouse Name</FormLabel><FormControl><Input placeholder="Main Warehouse" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={warehouseForm.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="MW-001" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={warehouseForm.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="123 Industrial Blvd" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={warehouseForm.control} name="isActive" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    <FormLabel>Active</FormLabel>
                  </div>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateWarehouseDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createWarehouseMutation.isPending}>Create Warehouse</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Location Dialog */}
      <Dialog open={isCreateLocationDialogOpen} onOpenChange={setIsCreateLocationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Location</DialogTitle>
            <DialogDescription>Add a new location within a warehouse</DialogDescription>
          </DialogHeader>
          <Form {...locationForm}>
            <form onSubmit={handleCreateLocationSubmit} className="space-y-4 py-4">
              <FormField control={locationForm.control} name="warehouseId" render={({ field }) => (
                <FormItem><FormLabel>Warehouse</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value as string | undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {warehousesResponse?.data?.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
<FormField control={locationForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Location Name</FormLabel><FormControl><Input placeholder="Main Store" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
              <FormField control={locationForm.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="MS" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
              <FormField control={locationForm.control} name="isActive" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    <FormLabel>Active</FormLabel>
                  </div>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateLocationDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createLocationMutation.isPending}>Create Location</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Warehouse Dialog */}
      {editingWarehouse && (
        <Dialog open={!!editingWarehouse} onOpenChange={(open) => { if (!open) setEditingWarehouse(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Warehouse</DialogTitle>
              <DialogDescription>Update warehouse details</DialogDescription>
            </DialogHeader>
            <Form {...warehouseForm}>
              <form onSubmit={handleUpdateWarehouseSubmit} className="space-y-4 py-4">
                <FormField control={warehouseForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Warehouse Name</FormLabel><FormControl><Input {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={warehouseForm.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={warehouseForm.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={warehouseForm.control} name="isActive" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
<input type="checkbox" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                      <FormLabel>Active</FormLabel>
                    </div>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingWarehouse(null)}>Cancel</Button>
                  <Button type="submit" loading={updateWarehouseMutation.isPending}>Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}