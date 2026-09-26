import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { categorySchema } from '@/lib/validations'
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
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  // Only managers can create categories
  if (auth.session!.role !== 'INVENTORY_MANAGER') {
    return NextResponse.json(
      { success: false, message: 'Forbidden: Only managers can create categories', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const validation = categorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: validation.data,
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.session!.userId,
        action: 'CREATE_CATEGORY',
        entity: 'Category',
        entityId: category.id,
        after: category,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      data: category,
    })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}