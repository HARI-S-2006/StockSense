// Socket.IO server route for Next.js
// This sets up the Socket.IO server on the same port as Next.js

import { NextRequest, NextResponse } from 'next/server'
import { Server as HttpServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { getSession } from '@/lib/auth'

// Global variable to store the Socket.IO server instance
let io: SocketIOServer | null = null

export async function GET(request: NextRequest) {
  // This endpoint is used to initialize the Socket.IO server
  // In a real deployment, you'd run Socket.IO on a separate server
  return NextResponse.json({ message: 'Socket.IO server should be run separately' })
}

// Helper to initialize Socket.IO with the HTTP server
export function initializeSocketIO(httpServer: HttpServer) {
  if (io) return io

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const session = await getSessionFromToken(token)
      if (!session) {
        return next(new Error('Invalid or expired session'))
      }

      socket.data.user = session
      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user
    console.log(`🔌 Client connected: ${socket.id} (User: ${user.userId})`)

    socket.join(`user:${user.userId}`)
    socket.join(`role:${user.role}`)
    socket.join('inventory')

    socket.on('subscribe:product', (productId: string) => {
      socket.join(`product:${productId}`)
    })

    socket.on('unsubscribe:product', (productId: string) => {
      socket.leave(`product:${productId}`)
    })

    socket.on('subscribe:warehouse', (warehouseId: string) => {
      socket.join(`warehouse:${warehouseId}`)
    })

    socket.on('subscribe:dashboard', () => {
      socket.join('dashboard')
    })

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`)
    })
  })

  return io
}

async function getSessionFromToken(token: string) {
  // This would normally use the verifySession from lib/auth
  // For now, return null to indicate it needs proper implementation
  return null
}

export function getIO() {
  return io
}