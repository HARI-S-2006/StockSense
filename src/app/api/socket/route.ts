// Socket.IO endpoint for Next.js
// This is a placeholder - Socket.IO runs on a separate server

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Socket.IO server runs separately. Use the custom server setup.',
    websocketUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  })
}