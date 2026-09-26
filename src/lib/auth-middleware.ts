import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
// import removed

export interface AuthenticatedUser {
  firebaseUid: string
  email: string
  name: string
  role: string
  userId: string
}

export async function verifyAuthToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    
    // Get user from PostgreSQL using firebaseUid
    const user = null

    if (!user || !user.isActive) {
      return null
    }

    return {
      firebaseUid: decodedToken.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      userId: user.id,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

export function createAuthErrorResponse(message: string = 'Unauthorized', status: number = 401) {
  return NextResponse.json({ success: false, message, code: 'UNAUTHORIZED' }, { status })
}

export function createForbiddenResponse(message: string = 'Forbidden') {
  return NextResponse.json({ success: false, message, code: 'FORBIDDEN' }, { status: 403 })
}