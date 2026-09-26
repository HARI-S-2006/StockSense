import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { hashPassword } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

async function requireAuth(request: NextRequest) {
  const auth = await verifyAuthToken(request)
  if (!auth) {
    return { error: NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }), auth: null as any }
  }
  return { error: null, auth }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.auth!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    const user = await prisma.user.findUnique({ where: { id: auth.auth!.userId } })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (name && name !== user.name) {
      updateData.name = name
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password is required', code: 'MISSING_CURRENT_PASSWORD' },
          { status: 400 }
        )
      }

      const bcrypt = await import('bcryptjs')
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Current password is incorrect', code: 'INVALID_CURRENT_PASSWORD' },
          { status: 400 }
        )
      }

      updateData.passwordHash = await hashPassword(newPassword)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No changes provided', code: 'NO_CHANGES' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.auth!.userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: auth.auth!.userId,
        action: 'UPDATE_PRODUCT',
        entity: 'User',
        entityId: auth.auth!.userId,
        before: { name: user.name },
        after: { name: updatedUser.name },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}