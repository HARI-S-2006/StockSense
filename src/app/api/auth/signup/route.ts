import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'
import { signupSchema } from '@/lib/validations'
import { generateOTP } from '@/lib/utils'
import { emailService } from '@/lib/email'
import { AuditAction } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = signupSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, role } = validation.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Email already registered', code: 'EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    })

    // Create session
    const token = await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    // Set cookie
    setSessionCookie(token)

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_PRODUCT', // Reusing action type, could add CREATE_USER
        entity: 'User',
        entityId: user.id,
        after: { name, email, role },
      },
    })

    // Send welcome email
    await emailService.sendWelcomeEmail(email, name)

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}