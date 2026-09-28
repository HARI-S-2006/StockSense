import { ResetPasswordForm } from './ResetPasswordForm'

interface PageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams
  const email = params.email || ''

  return <ResetPasswordForm email={email} />
}