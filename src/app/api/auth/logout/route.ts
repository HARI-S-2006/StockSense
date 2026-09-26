import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { deleteSession, clearSessionCookie, getSession } from '@/lib/auth'
import { AuditAction } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (session) {
      const cookieStore = await cookies()
      const token = cookieStore.get('stocksense_session')?.value
      
      if (token) {
        await deleteSession(token)
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'LOGOUT',
          entity: 'User',
          entityId: session.userId,
        },
      })
    }

    await clearSessionCookie()

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}