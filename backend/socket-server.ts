import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyIdToken } from '../src/lib/firebase-admin'

interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      userId: string
      email: string
      name: string
      role: string
    }
  }
}

let io: any = null

export function initializeSocketIO(httpServer: any) {
  if (io) return io

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use(async (socket: any, next: any) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const payload = await verifyIdToken(token)
      if (!payload) {
        return next(new Error('Invalid or expired session'))
      }

      socket.data.user = { userId: payload.uid, email: '', name: '', role: '' }
      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: any) => {
    const user = socket.data.user
    console.log(`🔌 Client connected: ${socket.id} (User: ${user?.userId})`)

    if (user) {
      socket.join(`user:${user.userId}`)
      socket.join('inventory')
    }

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

export function getIO() {
  return io
}

export function emitStockUpdated(data: any) {
  io?.to('inventory').emit('stock.updated', data)
}

export function emitReceiptUpdated(data: any) {
  io?.to('inventory').emit('receipt.updated', data)
}

export function emitDeliveryUpdated(data: any) {
  io?.to('inventory').emit('delivery.updated', data)
}

export function emitTransferUpdated(data: any) {
  io?.to('inventory').emit('transfer.updated', data)
}

export function emitAdjustmentUpdated(data: any) {
  io?.to('inventory').emit('adjustment.updated', data)
}

export function emitLedgerCreated(data: any) {
  io?.to('inventory').emit('ledger.created', data)
}

export function emitAlertUpdated(data: any) {
  io?.to('inventory').emit('alert.updated', data)
}

export function emitDashboardUpdated(data: any) {
  io?.to('dashboard').emit('dashboard.updated', data)
}