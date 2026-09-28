import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { supplierSchema } from '@/lib/validations'
import { AuditAction } from '@prisma/client'

async function requireAuth() {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), session: null }
  }
  return { error: null, session }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: suppliers })
  } catch (error) {
    console.error('Get suppliers error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Only managers can create suppliers
  if (auth.session!.role !== 'INVENTORY_MANAGER') {
    return NextResponse.json(
      { success: false, message: 'Forbidden: Only managers can create suppliers', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const validation = supplierSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check code uniqueness
    const existing = await prisma.supplier.findUnique({ where: { code: validation.data.code } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Supplier code already exists', code: 'DUPLICATE_CODE' },
        { status: 409 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: validation.data,
    })

    return NextResponse.json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier,
    })
  } catch (error) {
    console.error('Create supplier error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}