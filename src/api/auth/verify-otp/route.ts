import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { getDoc, updateDoc, collections } from '@/lib/firestore'
import { signToken, hashPassword, Role } from '@/lib/auth'
import { verifyOTPSchema } from '@/lib/validations'

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

    const { email, otp, mode } = body

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: 'Email and OTP required' }, { status: 400 })
    }

    if (process.env.DEV_OTP_ENABLED === 'true' && otp === '123456') {
      let userRecord
      try {
        userRecord = await adminAuth.getUserByEmail(email)
      } catch {
        userRecord = await adminAuth.createUser({
          email,
          displayName: email.split('@')[0],
          emailVerified: true,
        })

        const userData = {
          id: userRecord.uid,
          name: email.split('@')[0],
          email,
          passwordHash: await hashPassword('temp123'),
          role: 'USER',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        await updateDoc(collections.users, userRecord.uid, userData)
      }

const userDoc = await getDoc<User>(collections.users, userRecord.uid)
      const name = (userDoc?.name ?? email.split('@')[0]) as string
      const role = (userDoc?.role ?? 'USER') as Role
      const token = await signToken({ 
        userId: userRecord.uid, 
        email: userRecord.email, 
        name: (name || 'User') as string, 
        role 
      })

      const response = NextResponse.json({
        success: true,
        message: 'OTP verified successfully',
        data: { uid: userRecord.uid, email: userRecord.email, name: userDoc?.name || email.split('@')[0], role: userDoc?.role || 'USER' },
      })

      response.cookies.set('stocksense_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      return response
    }

    return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 401 })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ success: false, message: 'OTP verification failed' }, { status: 500 })
  }
}

interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  role: string
  isActive: boolean
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
}