'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Package,
  AlertTriangle,
  Truck,
  ArrowRightLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { formatNumber, getStockStatusColor, getDocumentStatusColor, formatRelativeTime } from '@/lib/utils'
import { useRealtime, useDashboardUpdates, useAlertUpdates } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

interface KPIData {
  totalProductsInStock: number
  lowStockItems: number
  outOfStockItems: number
  pendingReceipts: number
  pendingDeliveries: number
  pendingTransfers: number
  lowStockAlerts: Array<{
    productId: string
    productName: string
    sku: string
    currentStock: number
    reorderLevel: number
    unit: string
  }>
  outOfStockAlerts: Array<{
    productId: string
    productName: string
    sku: string
    unit: string
  }>
  recentActivity: Array<{
    id: string
    productName: string
    sku: string
    operationType: string
    documentNumber: string
    quantityChange: number
    newQuantity: number
    warehouse: string
    location: string
    user: string
    date: string
  }>
  stockByWarehouse: Array<{
    warehouseId: string
    warehouseName: string
    totalProducts: number
    totalQuantity: number
  }>
  stockByLocation: Array<{
    locationId: string
    locationName: string
    warehouseName: string | null
    totalProducts: number
    totalQuantity: number
  }>
  pendingOperations: Array<{
    type: string
    id: string
    number: string
    status: string
    location?: string
    from?: string
    to?: string
    date: string
  }>
}

interface DashboardResponse {
  success: boolean
  data: KPIData
}

const kpiCards = [
  {
    name: 'Total Products in Stock',
    icon: Package,
    color: 'bg-blue-500',
    key: 'totalProductsInStock',
  },
  {
    name: 'Low Stock Items',
    icon: AlertTriangle,
    color: 'bg-yellow-500',
    key: 'lowStockItems',
  },
  {
    name: 'Out of Stock Items',
    icon: Minus,
    color: 'bg-red-500',
    key: 'outOfStockItems',
  },
  {
    name: 'Pending Receipts',
    icon: TrendingUp,
    color: 'bg-green-500',
    key: 'pendingReceipts',
  },
  {
    name: 'Pending Deliveries',
    icon: Truck,
    color: 'bg-orange-500',
    key: 'pendingDeliveries',
  },
  {
    name: 'Pending Transfers',
    icon: ArrowRightLeft,
    color: 'bg-purple-500',
    key: 'pendingTransfers',
  },
] as const

export default function DashboardPage() {
  const { data: dashboardData, isLoading, refetch } = useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      return res.json()
    },
    refetchInterval: 30000,
  })

  // Real-time updates
  const { on } = useRealtime()
  const { kpis } = useDashboardUpdates()
  const { latestAlert } = useAlertUpdates()

  React.useEffect(() => {
    const unsubscribe = on('dashboard.updated', () => {
      refetch()
    })
    return unsubscribe
  }, [on, refetch])

  React.useEffect(() => {
    if (latestAlert) {
      refetch()
    }
  }, [latestAlert, refetch])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpiCards.map((kpi) => (
            <Card key={kpi.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.name}</p>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted animate-pulse">
                      <kpi.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const data = dashboardData?.data

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your inventory operations</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <Loader2 className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => {
          const value = data?.[kpi.key as keyof KPIData] ?? 0
          return (
            <Card key={kpi.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.name}</p>
                    <p className="text-3xl font-bold">{formatNumber(value as number)}</p>
                  </div>
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', kpi.color)}>
                    <kpi.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Alerts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Low Stock Alerts
            </CardTitle>
            <Badge variant={data?.lowStockAlerts.length > 0 ? 'warning' : 'secondary'}>
              {data?.lowStockAlerts.length ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            {data?.lowStockAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No low stock items</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.lowStockAlerts.map((alert) => (
                  <div key={alert.productId} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <div>
                      <p className="font-medium">{alert.productName}</p>
                      <p className="text-sm text-muted-foreground">{alert.sku} • {alert.currentStock} {alert.unit} (Reorder: {alert.reorderLevel})</p>
                    </div>
                    <Badge variant="warning">LOW STOCK</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Out of Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Out of Stock
            </CardTitle>
            <Badge variant={data?.outOfStockAlerts.length > 0 ? 'destructive' : 'secondary'}>
              {data?.outOfStockAlerts.length ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            {data?.outOfStockAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No out of stock items</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.outOfStockAlerts.map((alert) => (
                  <div key={alert.productId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                      <p className="font-medium">{alert.productName}</p>
                      <p className="text-sm text-muted-foreground">{alert.sku} • {alert.unit}</p>
                    </div>
                    <Badge variant="destructive">OUT OF STOCK</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Pending Operations */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Inventory Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        activity.operationType === 'RECEIPT' && 'bg-green-100 text-green-600',
                        activity.operationType === 'DELIVERY' && 'bg-red-100 text-red-600',
                        activity.operationType === 'TRANSFER_IN' && 'bg-blue-100 text-blue-600',
                        activity.operationType === 'TRANSFER_OUT' && 'bg-orange-100 text-orange-600',
                        activity.operationType.startsWith('ADJUSTMENT') && 'bg-purple-100 text-purple-600',
                      )}>
                        {activity.quantityChange > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.documentNumber} • {activity.warehouse} / {activity.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-medium text-sm',
                        activity.quantityChange > 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {activity.quantityChange > 0 ? '+' : ''}{formatNumber(activity.quantityChange)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Operations</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.pendingOperations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending operations</p>
            ) : (
              <div className="space-y-3">
                {data.pendingOperations.slice(0, 10).map((op) => (
                  <div key={op.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        op.type === 'RECEIPT' ? 'success' :
                        op.type === 'DELIVERY' ? 'destructive' :
                        'default'
                      }>
                        {op.type}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{op.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {op.from ? `${op.from} → ${op.to}` : op.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        op.status === 'WAITING' ? 'default' :
                        op.status === 'READY' ? 'secondary' :
                        'outline'
                      }>
                        {op.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock by Warehouse & Location */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stock by Warehouse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.stockByWarehouse.map((w) => (
                <div key={w.warehouseId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{w.warehouseName}</p>
                    <p className="text-sm text-muted-foreground">{w.totalProducts} products</p>
                  </div>
                  <p className="font-medium">{formatNumber(w.totalQuantity)} units</p>
                </div>
              ))}
              {data?.stockByWarehouse.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No warehouse data</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.stockByLocation.slice(0, 10).map((l) => (
                <div key={l.locationId} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{l.locationName}</p>
                    <p className="text-sm text-muted-foreground">{l.warehouseName} • {l.totalProducts} products</p>
                  </div>
                  <p className="font-medium">{formatNumber(l.totalQuantity)} units</p>
                </div>
              ))}
              {data?.stockByLocation.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No location data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}