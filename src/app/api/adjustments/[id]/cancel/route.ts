import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { cancelAdjustment } from '@/lib/inventory-engine'

async function requireAuth(request: NextRequest) {
  const auth = await verifyAuthToken(request)
  if (!auth) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), auth: null as any }
  }
  return { error: null, auth }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const { id } = await params

    const result = await cancelAdjustment(id, auth.auth!.userId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message, code: result.code },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (error) {
    console.error('Cancel adjustment error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}