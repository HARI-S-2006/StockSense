'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Package } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!result.success) {
        toast({ title: 'Error', description: result.message, variant: 'destructive' })
        return
      }

      toast({ title: 'Success', description: 'Account created successfully' })
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
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Join StockSense Inventory Management</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              {...register('name')}
              disabled={isLoading}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive" role="alert">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@company.com"
              {...register('email')}
              disabled={isLoading}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-sm text-destructive" role="alert">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
            <Label htmlFor="confirmPassword">Confirm Password</Label>
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

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select id="role" {...register('role')} disabled={isLoading} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="WAREHOUSE_STAFF">Warehouse Staff</option>
              <option value="INVENTORY_MANAGER">Inventory Manager</option>
            </select>
            {errors.role && <p className="text-sm text-destructive" role="alert">{errors.role.message}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isLoading}>
            Create Account
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link href="/login" className="text-center text-sm text-primary hover:underline">
          Already have an account? Sign in
        </Link>
      </CardFooter>
    </Card>
  )
}