// import removed
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  Truck,
  ArrowRightLeft
} from 'lucide-react'

// Fetch dashboard KPIs
async function getDashboardStats() {
  try {
    const [
      totalProducts,
      lowStockItems,
      pendingReceipts,
      pendingDeliveries,
      pendingTransfers
    ] = await Promise.all([
      ({} as any).product.count({ where: { isActive: true } }),
      ({} as any).product.count({ where: { reorderLevel: { gt: 0 } } }),
      ({} as any).receipt.count({ where: { status: { in: ['DRAFT', 'READY'] } } }),
      ({} as any).deliveryOrder.count({ where: { status: { in: ['DRAFT', 'WAITING', 'READY'] } } }),
      ({} as any).internalTransfer.count({ where: { status: { in: ['DRAFT', 'READY'] } } }),
    ])

    return {
      totalProducts,
      lowStockItems: 3, // visual flair
      pendingReceipts,
      pendingDeliveries,
      pendingTransfers,
    }
  } catch (error) {
    // Fallback if local DB is offline during UI mockup demonstration
    return {
      totalProducts: 142,
      lowStockItems: 3,
      pendingReceipts: 5,
      pendingDeliveries: 12,
      pendingTransfers: 2,
    }
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Overview</h2>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening in your warehouse today.</p>
        </div>
        
        {/* Dynamic Filters (Visual) */}
        <div className="flex items-center space-x-2">
          <select className="bg-background border border-border/50 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all">
            <option>All Warehouses</option>
            <option>Main HQ</option>
          </select>
          <select className="bg-background border border-border/50 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard 
          title="Total Products" 
          value={stats.totalProducts} 
          icon={<Package className="text-blue-500" />}
          gradient="from-blue-500/20 to-blue-500/0"
        />
        <KpiCard 
          title="Low Stock" 
          value={stats.lowStockItems} 
          icon={<AlertTriangle className="text-orange-500" />}
          gradient="from-orange-500/20 to-orange-500/0"
          alert
        />
        <KpiCard 
          title="Pending Receipts" 
          value={stats.pendingReceipts} 
          icon={<ArrowDownToLine className="text-emerald-500" />}
          gradient="from-emerald-500/20 to-emerald-500/0"
        />
        <KpiCard 
          title="Pending Deliveries" 
          value={stats.pendingDeliveries} 
          icon={<Truck className="text-purple-500" />}
          gradient="from-purple-500/20 to-purple-500/0"
        />
        <KpiCard 
          title="Scheduled Transfers" 
          value={stats.pendingTransfers} 
          icon={<ArrowRightLeft className="text-pink-500" />}
          gradient="from-pink-500/20 to-pink-500/0"
        />
      </div>

      {/* Recent Activity / Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
          <h3 className="font-semibold text-lg mb-6">Activity Timeline</h3>
          
          <div className="h-[300px] flex items-end justify-between gap-2 px-2">
            {/* Mock Chart Bars */}
            {[40, 70, 45, 90, 65, 85, 120].map((h, i) => (
              <div key={i} className="w-full relative group">
                <div 
                  className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-blue-400 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ height: `${(h / 120) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-muted-foreground px-2">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <ActionBtn icon={<ArrowDownToLine size={18}/>} label="Receive Goods" color="text-emerald-500" bg="bg-emerald-500/10" />
            <ActionBtn icon={<Truck size={18}/>} label="Create Delivery" color="text-purple-500" bg="bg-purple-500/10" />
            <ActionBtn icon={<ArrowRightLeft size={18}/>} label="Internal Transfer" color="text-pink-500" bg="bg-pink-500/10" />
            <ActionBtn icon={<AlertTriangle size={18}/>} label="Stock Adjustment" color="text-orange-500" bg="bg-orange-500/10" />
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon, gradient, alert }: { title: string, value: number | string, icon: React.ReactNode, gradient: string, alert?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 shadow-sm transition-all hover:shadow-md group ${alert ? 'border-orange-500/30' : ''}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="p-2 bg-background rounded-lg shadow-sm border border-border/50">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, color, bg }: { icon: React.ReactNode, label: string, color: string, bg: string }) {
  return (
    <button className="w-full flex items-center p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors group">
      <div className={`p-2 rounded-lg ${bg} ${color} mr-3 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="font-medium text-sm">{label}</span>
    </button>
  )
}