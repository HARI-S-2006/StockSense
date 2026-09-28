import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetPasswordSchema } from '@/lib/validations'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, otp, password } = validation.data

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid request', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    // Find valid OTP
    const otpRecord = await prisma.passwordResetOTP.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: 'OTP expired or not found', code: 'OTP_EXPIRED' },
        { status: 400 }
      )
    }

    // Verify OTP
    const isValid = await verifyPassword(otp, otpRecord.otpHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP', code: 'INVALID_OTP' },
        { status: 400 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Mark OTP as used
    await prisma.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    })

    // Invalidate all existing sessions
    await prisma.session.deleteMany({ where: { userId: user.id } })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESET_PASSWORD',
        entity: 'User',
        entityId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}