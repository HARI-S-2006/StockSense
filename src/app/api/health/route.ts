import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Quick test to ensure DB is connected
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'ok',
      service: 'stocksense-api',
      database: 'connected'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      service: 'stocksense-api',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}
