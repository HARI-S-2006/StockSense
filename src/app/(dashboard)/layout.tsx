'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { useSession } from '@/hooks/use-session'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Redirect } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      router.push('/login')
    }
  }, [session, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  return <MainLayout>{children}</MainLayout>
}