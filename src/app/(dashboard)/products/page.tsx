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
import { Package, Plus, Search, Filter, Edit, Trash2, Eye, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductInput } from '@/lib/validations'
import { cn, formatNumber, getStockStatusColor } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface Product {
  id: string
  name: string
  sku: string
  categoryId: string
  category: { id: string; name: string }
  unitOfMeasure: string
  reorderLevel: number
  initialStock: number
  description: string | null
  isActive: boolean
  totalStock: number
  stockStatus: string
  stockByLocation: Array<{
    warehouseId: string
    warehouseName: string
    locationId: string
    locationName: string
    quantity: number
  }>
  createdAt: string
  updatedAt: string
}

interface ProductsResponse {
  success: boolean
  data: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface Category {
  id: string
  name: string
}

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const { data: productsResponse, isLoading } = useQuery<ProductsResponse>({
    queryKey: ['products', { search, categoryFilter, statusFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      if (statusFilter) params.set('stockStatus', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '20')
      const res = await fetch(`/api/products?${params}`)
      return res.json()
    },
  })

  const { data: categoriesResponse } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: ProductInput) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Success', description: 'Product created successfully' })
      setIsCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductInput> }) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Success', description: 'Product updated successfully' })
      setEditingProduct(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Success', description: 'Product deleted successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createForm = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      categoryId: '',
      unitOfMeasure: 'pcs',
      reorderLevel: 0,
      initialStock: 0,
      description: '',
      isActive: true,
    },
  })

  const updateForm = useForm<Partial<ProductInput>>({
    resolver: zodResolver(productSchema.partial()),
  })

  const handleCreateSubmit = createForm.handleSubmit((data) => createMutation.mutate(data))
  const handleUpdateSubmit = updateForm.handleSubmit((data) => updateMutation.mutate({ id: editingProduct!.id, data }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products, SKU..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categoriesResponse?.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="IN_STOCK">In Stock</SelectItem>
                <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead className="text-right">Total Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No products found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      productsResponse?.data.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><code className="text-sm">{product.sku}</code></TableCell>
                          <TableCell>{product.category?.name}</TableCell>
                          <TableCell>{product.unitOfMeasure}</TableCell>
                          <TableCell>{formatNumber(product.reorderLevel)}</TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(product.totalStock)}</TableCell>
                          <TableCell>
                            <Badge className={getStockStatusColor(product.stockStatus)}>
                              {product.stockStatus.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/products/${product.id}`}><Eye className="h-4 w-4" /></Link>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { updateForm.reset(product); setEditingProduct(product); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(product.id) }}>
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
              {productsResponse && productsResponse.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {productsResponse.pagination.page} of {productsResponse.pagination.totalPages} • {productsResponse.pagination.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(productsResponse.pagination.totalPages, p + 1))} disabled={page === productsResponse.pagination.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Product</DialogTitle>
            <DialogDescription>Add a new product to your inventory</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
              <FormField control={createForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="Steel Rods" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={createForm.control} name="sku" render={({ field }) => (
                <FormItem><FormLabel>SKU / Code</FormLabel><FormControl><Input placeholder="STL-001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={createForm.control} name="categoryId" render={({ field }) => (
                  <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categoriesResponse?.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="unitOfMeasure" render={({ field }) => (
                  <FormItem><FormLabel>Unit of Measure</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="pcs" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['pcs', 'kg', 'liters', 'boxes', 'units', 'meters'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField control={createForm.control} name="reorderLevel" render={({ field }) => (
                  <FormItem><FormLabel>Reorder Level</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={createForm.control} name="initialStock" render={({ field }) => (
                  <FormItem><FormLabel>Initial Stock</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={createForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Optional description" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createMutation.isPending}>Create Product</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={(open) => { if (!open) setEditingProduct(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update product details</DialogDescription>
            </DialogHeader>
            <Form {...updateForm}>
              <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4">
                <FormField control={updateForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={updateForm.control} name="sku" render={({ field }) => (
                  <FormItem><FormLabel>SKU / Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={updateForm.control} name="categoryId" render={({ field }) => (
                    <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categoriesResponse?.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={updateForm.control} name="unitOfMeasure" render={({ field }) => (
                    <FormItem><FormLabel>Unit of Measure</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="pcs" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['pcs', 'kg', 'liters', 'boxes', 'units', 'meters'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={updateForm.control} name="reorderLevel" render={({ field }) => (
                    <FormItem><FormLabel>Reorder Level</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={updateForm.control} name="initialStock" render={({ field }) => (
                    <FormItem><FormLabel>Initial Stock</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={updateForm.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={updateForm.control} name="isActive" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                      <FormLabel>Active</FormLabel>
                    </div>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
                  <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}