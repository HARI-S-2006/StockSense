import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - StockSense',
  description: 'Real-time inventory management dashboard',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}