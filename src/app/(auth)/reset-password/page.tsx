import { Suspense } from 'react'
import ResetPasswordForm from './reset-password-form'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}