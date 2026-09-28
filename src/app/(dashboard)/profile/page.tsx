'use client'

import * as React from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Shield, Key, Loader2, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn, formatDate } from '@/lib/utils'
import { profileSchema } from '@/lib/validations'
import { toast } from '@/hooks/use-toast'
import { useSession } from '@/hooks/use-session'

interface ProfileFormData {
  name: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { session, setSession } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.name || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<{ name: string; currentPassword: string; newPassword: string }>) => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return res.json()
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        setSession(result.data)
      }
      toast({ title: 'Success', description: 'Profile updated successfully' })
      setIsLoading(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      setIsLoading(false)
    },
  })

  const handleProfileSubmit = profileForm.handleSubmit((data: ProfileFormData) => {
    setIsLoading(true)
    if (data.newPassword) {
      updateProfileMutation.mutate({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
    } else {
      updateProfileMutation.mutate({ name: data.name })
    }
  })

  const handleTabChange = (tab: 'profile' | 'password') => {
    setActiveTab(tab)
    profileForm.reset({
      name: session?.name || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center">
                <User className="h-10 w-10 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{session?.name}</h2>
                <p className="text-muted-foreground">{session?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={session?.role === 'INVENTORY_MANAGER' ? 'success' : 'secondary'}>
                    {session?.role?.toLowerCase().replace('_', ' ') || 'User'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{session?.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'outline'}
          onClick={() => setActiveTab('profile')}
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </Button>
        <Button
          variant={activeTab === 'password' ? 'default' : 'outline'}
          onClick={() => setActiveTab('password')}
        >
          <Key className="mr-2 h-4 w-4" />
          Password
        </Button>
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((data) => {
                setIsLoading(true)
                updateProfileMutation.mutate({ name: data.name })
              })} className="space-y-6">
                <FormField control={profileForm.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input value={session?.email} disabled />
                  </FormControl>
                  <FormDescription>Email cannot be changed. Contact support if you need to update it.</FormDescription>
                </FormItem>
                <Button type="submit" loading={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password for security</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((data) => {
                setIsLoading(true)
                updateProfileMutation.mutate({
                  currentPassword: data.currentPassword,
                  newPassword: data.newPassword,
                })
              })} className="space-y-6">
                <FormField control={profileForm.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={profileForm.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={profileForm.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" loading={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}