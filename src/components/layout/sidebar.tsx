'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Package, 
  ArrowRightLeft, 
  Settings, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  History
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Operations', href: '/operations', icon: ArrowRightLeft, subItems: [
    { name: 'Receipts', href: '/operations/receipts' },
    { name: 'Deliveries', href: '/operations/deliveries' },
    { name: 'Transfers', href: '/operations/transfers' },
    { name: 'Adjustments', href: '/operations/adjustments' },
  ]},
  { name: 'Move History', href: '/history', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-background/80 backdrop-blur-xl border-r border-border/50 sticky top-0 flex flex-col justify-between py-6 z-50 overflow-hidden"
    >
      <div>
        <div className="flex items-center px-6 mb-10 h-10">
          <div className="bg-primary/20 p-2 rounded-lg text-primary mr-3 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            <TrendingDown className="h-6 w-6 rotate-180" />
          </div>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400 tracking-tight"
            >
              StockSense
            </motion.span>
          )}
        </div>

        <nav className="space-y-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <div key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                    />
                  )}
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", collapsed ? "mx-auto" : "mr-3")} />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
                
                {/* Sub-items */}
                {!collapsed && item.subItems && isActive && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="ml-9 mt-1 space-y-1 overflow-hidden"
                  >
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          pathname === subItem.href 
                            ? "text-primary font-medium bg-primary/5" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      <div className="px-4 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-3 rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
        
        <div className={cn(
          "flex items-center bg-muted/30 border border-border/50 rounded-2xl p-3 transition-all",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center min-w-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg">
              JS
            </div>
            {!collapsed && (
              <div className="ml-3 truncate">
                <p className="text-sm font-medium text-foreground truncate">John Smith</p>
                <p className="text-xs text-muted-foreground truncate">Manager</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}