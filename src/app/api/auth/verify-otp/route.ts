import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOTPSchema } from '@/lib/validations'
import { verifyPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = verifyOTPSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, otp } = validation.data

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid OTP', code: 'INVALID_OTP' },
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

    // Check attempts
    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Request a new OTP.', code: 'MAX_ATTEMPTS' },
        { status: 400 }
      )
    }

    // Verify OTP
    const isValid = await verifyPassword(otp, otpRecord.otpHash)
    if (!isValid) {
      // Increment attempts
      await prisma.passwordResetOTP.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      })
      return NextResponse.json(
        { success: false, message: 'Invalid OTP', code: 'INVALID_OTP' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await prisma.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { used: true },
    })

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}