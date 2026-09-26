import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top ambient glow */}
        <div className="absolute top-0 left-1/4 w-1/2 h-48 bg-primary/20 blur-[100px] rounded-full pointer-events-none -z-10" />
        
        {/* Header / Topbar Area */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-40">
          <h1 className="text-lg font-semibold tracking-tight">StockSense Operations</h1>
          <div className="flex items-center space-x-4">
            {/* Topbar widgets could go here */}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 relative">
          {children}
        </div>
      </main>
    </div>
  )
}