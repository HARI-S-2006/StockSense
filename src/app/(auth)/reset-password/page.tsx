'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Package } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email },
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Password reset successfully' })
      router.push('/login')
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
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>Enter the OTP and your new password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input type="hidden" {...register('email')} />

          <div className="space-y-2">
            <Label htmlFor="otp">OTP Code</Label>
            <Input
              id="otp"
              placeholder="123456"
              maxLength={6}
              {...register('otp')}
              disabled={isLoading}
              aria-invalid={!!errors.otp}
              className="text-center text-lg tracking-widest"
            />
            {errors.otp && <p className="text-sm text-destructive" role="alert">{errors.otp.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              disabled={isLoading}
              aria-invalid={!!errors.password}
            />
            {errors.password && <p className="text-sm text-destructive" role="alert">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register('confirmPassword')}
              disabled={isLoading}
              aria-invalid={!!errors.confirmPassword}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive" role="alert">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Reset Password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link href="/login" className="text-center text-sm text-primary hover:underline">
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  )
}