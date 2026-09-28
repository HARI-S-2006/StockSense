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
import { Package, Plus, Search, Filter, Edit, Trash2, Eye, Loader2, Tag } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema } from '@/lib/validations'
import { cn, formatNumber } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { products: number }
}

interface CategoriesResponse {
  success: boolean
  data: Category[]
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const categoriesQueryFn = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    params.set('page', page.toString())
    params.set('limit', '20')
    const url = "/api/categories?" + params.toString()
    const res = await fetch(url)
    return res.json()
  }

  const { data: categoriesResponse, isLoading } = useQuery({
    queryKey: ['categories', { search, page }],
    queryFn: categoriesQueryFn,
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; isActive: boolean }) => {
      const url = '/api/categories'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Success', description: 'Category created successfully' })
      setIsCreateDialogOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; description?: string; isActive: boolean }> }) => {
      const url = `/api/categories/${id}`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Success', description: 'Category updated successfully' })
      setEditingCategory(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const url = `/api/categories/${id}`
      const res = await fetch(url, { method: 'DELETE' })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast({ title: 'Success', description: 'Category deleted successfully' })
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    },
  })

  const createForm = useForm<{ name: string; description?: string; isActive: boolean }>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  })

  const updateForm = useForm<Partial<{ name: string; description?: string; isActive: boolean }>>({
    resolver: zodResolver(categorySchema.partial()),
  })

  const handleCreateSubmit = createForm.handleSubmit((data) => createMutation.mutate(data))
  const handleUpdateSubmit = updateForm.handleSubmit((data) => updateMutation.mutate({ id: editingCategory!.id, data }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage product categories</p>
        </div>
        <Button onClick={() => { createForm.reset(); setIsCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
                onKeyDown={(e) => { if (e.key === 'Enter') setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading categories...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoriesResponse?.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="mt-2 text-muted-foreground">No categories found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      categoriesResponse?.data?.map((category: { id: string; name: string; description: string | null; isActive: boolean; createdAt: string; updatedAt: string; _count: { products: number } }) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{category.name}</p>
                              {category.description && <p className="text-sm text-muted-foreground line-clamp-1">{category.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell>{category.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={category.isActive ? 'success' : 'destructive'}>
                              {category.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{category._count?.products ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => { updateForm.reset({ name: category.name, description: category.description ?? undefined, isActive: category.isActive }); setEditingCategory(category); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete this category?')) deleteMutation.mutate(category.id) }}>
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
              {categoriesResponse && categoriesResponse.length > 0 && (
                <div className="flex items-center justify-between border-t p-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil(categoriesResponse.length / 20)} • {categoriesResponse.length} total
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

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a new product category</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
              <FormField control={createForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Category Name</FormLabel><FormControl><Input placeholder="Raw Materials" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={createForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Optional description" {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={createForm.control} name="isActive" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    <FormLabel>Active</FormLabel>
                  </div>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createMutation.isPending}>Create Category</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      {editingCategory && (
        <Dialog open={!!editingCategory} onOpenChange={(open) => { if (!open) setEditingCategory(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update category details</DialogDescription>
            </DialogHeader>
            <Form {...updateForm}>
              <form onSubmit={handleUpdateSubmit} className="space-y-4 py-4">
                <FormField control={updateForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Category Name</FormLabel><FormControl><Input {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={updateForm.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} value={field.value as string | undefined} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={updateForm.control} name="isActive" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
<input type="checkbox" checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                      <FormLabel>Active</FormLabel>
                    </div>
                  </FormItem>
                )} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
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