'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Package } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [devOTP, setDevOTP] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true)
    setDevOTP(null)
    try {
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'If the email exists, a password reset OTP has been sent' })
      
      if (result.devOTP) {
        setDevOTP(result.devOTP)
      }

      router.push(`/reset-password?email=${encodeURIComponent(data.email)}`)
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
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>Enter your email to receive a reset OTP</CardDescription>
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
            {errors.email && <p className="text-sm text-destructive" role="alert">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Send Reset OTP
          </Button>
        </form>

        {devOTP && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-2">Development Mode - OTP:</p>
            <code className="text-lg font-mono text-amber-800 bg-amber-100 px-2 py-1 rounded">{devOTP}</code>
            <p className="text-xs text-amber-700 mt-2">This OTP is shown because email is not configured in development.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link href="/login" className="text-center text-sm text-primary hover:underline">
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  )
}