'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Package } from 'lucide-react'
import { useSession } from '@/hooks/use-session'
import { toast } from '@/hooks/use-toast'

export default function LoginPage() {
  const router = useRouter()
  const { setSession } = useSession()
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Logged in successfully' })

      // Get session from API
      const sessionResponse = await fetch('/api/auth/session')
      const sessionData = await sessionResponse.json()
      if (sessionData.success && sessionData.data) {
        setSession(sessionData.data)
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Package className="h-7 w-7 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your StockSense account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="manager@stocksense.com"
              {...register('email')}
              disabled={isLoading}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-sm text-destructive" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              disabled={isLoading}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="text-sm text-destructive" role="alert">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Sign In
          </Button>
        </form>

        <Separator className="my-6" />

        <div className="text-center text-sm text-muted-foreground">
          <p>Demo credentials:</p>
          <p className="font-mono text-xs mt-1">manager@stocksense.com / Manager@123</p>
          <p className="font-mono text-xs">warehouse@stocksense.com / Staff@123</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link href="/signup" className="text-center text-sm text-primary hover:underline">
          Don't have an account? Sign up
        </Link>
      </CardFooter>
    </Card>
  )
}