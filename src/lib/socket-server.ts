// Socket.IO server setup - separate from Next.js routes
// This should be run as a separate process or integrated with a custom server

import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifySession } from '@/lib/auth'

// Global variable to store the Socket.IO server instance
let io: SocketIOServer | null = null

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

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const session = await verifySession(token)
      if (!session) {
        return next(new Error('Invalid or expired session'))
      }

      socket.data.user = session
      next()
    } catch (error) {
      next(new Error('Authentication failed'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user
    console.log(`🔌 Client connected: ${socket.id} (User: ${user?.userId})`)

    if (user) {
      socket.join(`user:${user.userId}`)
      socket.join(`role:${user.role}`)
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

// Event emitters
export function emitStockUpdated(data: {
  productId: string
  warehouseId: string
  locationId: string
  previousQuantity: number
  newQuantity: number
  change: number
  operationType: string
  documentNumber: string
}) {
  io?.to('inventory').emit('stock.updated', data)
}

export function emitReceiptUpdated(data: { receiptId: string; receiptNumber: string; status: string }) {
  io?.to('inventory').emit('receipt.updated', data)
}

export function emitDeliveryUpdated(data: { deliveryId: string; deliveryNumber: string; status: string }) {
  io?.to('inventory').emit('delivery.updated', data)
}

export function emitTransferUpdated(data: { transferId: string; transferNumber: string; status: string }) {
  io?.to('inventory').emit('transfer.updated', data)
}

export function emitAdjustmentUpdated(data: { adjustmentId: string; adjustmentNumber: string; status: string }) {
  io?.to('inventory').emit('adjustment.updated', data)
}

export function emitLedgerCreated(data: {
  entry: {
    id: string
    productId: string
    productName: string
    sku: string
    operationType: string
    documentNumber: string
    quantityChange: number
    newQuantity: number
    locationName: string
    warehouseName: string
    userName: string
    createdAt: string
  }
}) {
  io?.to('inventory').emit('ledger.created', data)
}

export function emitAlertUpdated(data: {
  productId: string
  locationId: string
  previousStatus: string
  newStatus: string
}) {
  io?.to('inventory').emit('alert.updated', data)
}