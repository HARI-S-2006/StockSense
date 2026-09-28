'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Truck,
  ArrowRightLeft,
  RotateCcw,
  History,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSession } from '@/hooks/use-session'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  {
    name: 'Operations',
    icon: Truck,
    children: [
      { name: 'Receipts', href: '/operations/receipts' },
      { name: 'Delivery Orders', href: '/operations/deliveries' },
      { name: 'Internal Transfers', href: '/operations/transfers' },
      { name: 'Inventory Adjustments', href: '/operations/adjustments' },
    ],
  },
  { name: 'Move History', href: '/move-history', icon: History },
  {
    name: 'Settings',
    icon: Settings,
    children: [
      { name: 'Warehouses', href: '/settings/warehouses' },
      { name: 'Locations', href: '/settings/locations' },
      { name: 'Categories', href: '/settings/categories' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { session, clearSession } = useSession()
  const [collapsed, setCollapsed] = React.useState(false)
  const [openSubmenus, setOpenSubmenus] = React.useState<Set<string>>(new Set())

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleLogout = () => {
    clearSession()
    window.location.href = '/login'
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn('flex h-16 items-center justify-center border-b px-4', collapsed && 'justify-center')}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">StockSense</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="flex items-center justify-center">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" role="navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            const isItemActive = item.href ? isActive(item.href) : false
            const hasChildren = 'children' in item && item.children

            if (hasChildren) {
              const isSubmenuOpen = openSubmenus.has(item.name)
              const isChildActive = item.children.some((child) => isActive(child.href))

              return (
                <div key={item.name}>
                  <Button
                    variant={isItemActive || isChildActive ? 'default' : 'ghost'}
                    className={cn('w-full justify-start gap-2', collapsed && 'justify-center px-2')}
                    onClick={() => toggleSubmenu(item.name)}
                    aria-expanded={isSubmenuOpen}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="flex-1 text-left">{item.name}</span>}
                    {!collapsed && (
                      <ChevronRight
                        className={cn('h-4 w-4 transition-transform', isSubmenuOpen && 'rotate-90')}
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                  {!collapsed && (
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-200 ease-in-out',
                        isSubmenuOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="pl-8 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                              isActive(child.href)
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                  isItemActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User & Collapse */}
        <div className="border-t p-4 space-y-2">
          {!collapsed && session && (
            <div className="flex items-center gap-3 px-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{session.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{session.role.toLowerCase().replace('_', ' ')}</p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            className={cn('w-full justify-start gap-2', collapsed && 'justify-center px-2')}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronRight className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </Button>

          {!collapsed && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}

function handleLogout() {
  // This will be called from the Sidebar component
  // The actual logout logic is in the parent component
}