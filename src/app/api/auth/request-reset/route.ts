import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/lib/validations'
import { generateOTP, hashPassword } from '@/lib/utils'
import { emailService } from '@/lib/email'
import { AuditAction } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    
    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset OTP has been sent',
      })
    }

    // Generate OTP
    const otp = generateOTP()
    const otpHash = await hashPassword(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP
    await prisma.passwordResetOTP.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    })

    // Send email
    const result = await emailService.sendOTPEmail(email, otp, user.name)

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_PASSWORD_RESET',
        entity: 'User',
        entityId: user.id,
      },
    })

    // In development mode, return the OTP for testing
    const devOTP = process.env.DEV_OTP_ENABLED === 'true' ? result.devOTP : undefined

    return NextResponse.json({
      success: true,
      message: 'If the email exists, a password reset OTP has been sent',
      devOTP, // Only in development
    })
  } catch (error) {
    console.error('Request reset error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}