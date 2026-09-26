'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'

interface Receipt {
  id: string
  receiptNumber: string
  supplierId: string
  warehouseId: string
  locationId: string
  status: string
  date: string
  items: any[]
  supplier: { name: string }
  warehouse: { name: string }
  location: { name: string }
}

export default function ReceiptsPage() {
  const queryClient = useQueryClient()
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const res = await fetch('/api/receipts')
      if (!res.ok) throw new Error('Failed to fetch receipts')
      return res.json()
    }
  })

  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/receipts/${id}/validate`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to validate receipt')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      toast({ title: 'Success', description: 'Receipt validated successfully' })
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  })

  const receipts = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-muted-foreground">Manage inbound inventory receipts</p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Receipt
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading receipts...</TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No receipts found. Create one to get started.</TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt: Receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>{receipt.date ? format(new Date(receipt.date), 'MMM d, yyyy') : 'N/A'}</TableCell>
                    <TableCell>{receipt.supplier?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {receipt.warehouse?.name} / {receipt.location?.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={receipt.status === 'DONE' ? 'default' : 'secondary'}>
                        {receipt.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {receipt.status === 'DRAFT' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => validateMutation.mutate(receipt.id)}
                          disabled={validateMutation.isPending}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Validate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
