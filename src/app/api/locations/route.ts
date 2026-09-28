import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { locationSchema } from '@/lib/validations'
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
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get('warehouseId')

    const where: Record<string, unknown> = { isActive: true }
    if (warehouseId) where.warehouseId = warehouseId

    const locations = await prisma.location.findMany({
      where,
      include: { warehouse: true },
      orderBy: [{ warehouse: { name: 'asc' } }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: locations })
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Only managers can create locations
  if (auth.session!.role !== 'INVENTORY_MANAGER') {
    return NextResponse.json(
      { success: false, message: 'Forbidden: Only managers can create locations', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const validation = locationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check code uniqueness within warehouse
    const existing = await prisma.location.findUnique({
      where: {
        warehouseId_code: {
          warehouseId: validation.data.warehouseId,
          code: validation.data.code,
        },
      },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Location code already exists in this warehouse', code: 'DUPLICATE_CODE' },
        { status: 409 }
      )
    }

    const location = await prisma.location.create({
      data: validation.data,
      include: { warehouse: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'CREATE_LOCATION',
        entity: 'Location',
        entityId: location.id,
        after: location,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Location created successfully',
      data: location,
    })
  } catch (error) {
    console.error('Create location error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}