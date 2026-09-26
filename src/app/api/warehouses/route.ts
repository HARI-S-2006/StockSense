import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { warehouseSchema } from '@/lib/validations'
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
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      include: {
        locations: { where: { isActive: true }, orderBy: { name: 'asc' } },
        _count: { select: { locations: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: warehouses })
  } catch (error) {
    console.error('Get warehouses error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Only managers can create warehouses
  if (auth.session!.role !== 'INVENTORY_MANAGER') {
    return NextResponse.json(
      { success: false, message: 'Forbidden: Only managers can create warehouses', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const validation = warehouseSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check code uniqueness
    const existing = await prisma.warehouse.findUnique({ where: { code: validation.data.code } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Warehouse code already exists', code: 'DUPLICATE_CODE' },
        { status: 409 }
      )
    }

    const warehouse = await prisma.warehouse.create({
      data: validation.data,
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'CREATE_WAREHOUSE',
        entity: 'Warehouse',
        entityId: warehouse.id,
        after: warehouse,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse,
    })
  } catch (error) {
    console.error('Create warehouse error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}