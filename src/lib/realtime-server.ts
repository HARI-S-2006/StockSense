import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { verifyIdToken } from './firebase-admin'

interface AuthenticatedSocket extends Socket {
  userId?: string
  userRole?: string
}

class RealtimeServer {
  private io: SocketIOServer | null = null
  private userSockets: Map<string, Set<string>> = new Map()

  initialize(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
        if (!token) {
          return next(new Error('Authentication required'))
        }

        const payload = await verifyIdToken(token)
        if (!payload) {
          return next(new Error('Invalid or expired session'))
        }

        socket.userId = payload.uid
        socket.userRole = 'WAREHOUSE_STAFF' // We'll get the actual role from the database
        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 Client connected: ${socket.id} (User: ${socket.userId})`)

      if (socket.userId) {
        if (!this.userSockets.has(socket.userId)) {
          this.userSockets.set(socket.userId, new Set())
        }
        this.userSockets.get(socket.userId)!.add(socket.id)
      }

      socket.join(`user:${socket.userId}`)
      socket.join(`role:${socket.userRole}`)
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
        if (socket.userId) {
          const userSocketSet = this.userSockets.get(socket.userId)
          if (userSocketSet) {
            userSocketSet.delete(socket.id)
            if (userSocketSet.size === 0) {
              this.userSockets.delete(socket.userId)
            }
          }
        }
      })
    })

    console.log('🔌 Socket.IO server initialized on port 4000')
  }

  getIO(): SocketIOServer | null {
    return this.io
  }

  broadcast(event: string, data: unknown) {
    this.io?.emit(event, data)
  }

  broadcastToUser(userId: string, event: string, data: unknown) {
    this.io?.to(`user:${userId}`).emit(event, data)
  }

  broadcastToRole(role: string, event: string, data: unknown) {
    this.io?.to(`role:${role}`).emit(event, data)
  }

  broadcastInventory(event: string, data: unknown) {
    this.io?.to('inventory').emit(event, data)
  }

  broadcastDashboard(event: string, data: unknown) {
    this.io?.to('dashboard').emit(event, data)
  }

  broadcastProduct(productId: string, event: string, data: unknown) {
    this.io?.to(`product:${productId}`).emit(event, data)
  }

  broadcastWarehouse(warehouseId: string, event: string, data: unknown) {
    this.io?.to(`warehouse:${warehouseId}`).emit(event, data)
  }

  getConnectedUsersCount(): number {
    return this.userSockets.size
  }

  getTotalConnections(): number {
    let count = 0
    for (const sockets of this.userSockets.values()) {
      count += sockets.size
    }
    return count
  }
}

export const realtimeServer = new RealtimeServer()

export interface RealtimeEvents {
  'stock.updated': {
    productId: string
    warehouseId: string
    locationId: string
    previousQuantity: number
    newQuantity: number
    change: number
    operationType: string
    documentNumber: string
  }
  'product.updated': {
    productId: string
    changes: Record<string, unknown>
  }
  'receipt.updated': {
    receiptId: string
    receiptNumber: string
    status: string
  }
  'delivery.updated': {
    deliveryId: string
    deliveryNumber: string
    status: string
  }
  'transfer.updated': {
    transferId: string
    transferNumber: string
    status: string
  }
  'adjustment.updated': {
    adjustmentId: string
    adjustmentNumber: string
    status: string
  }
  'ledger.created': {
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
  }
  'alert.updated': {
    productId: string
    locationId: string
    previousStatus: string
    newStatus: string
  }
  'dashboard.updated': {
    kpis: Record<string, number>
  }
}

export function emitStockUpdated(data: RealtimeEvents['stock.updated']) {
  realtimeServer.broadcastInventory('stock.updated', data)
  realtimeServer.broadcastDashboard('dashboard.updated', { kpis: {} })
  realtimeServer.broadcastProduct(data.productId, 'stock.updated', data)
  realtimeServer.broadcastWarehouse(data.warehouseId, 'stock.updated', data)
}

export function emitProductUpdated(productId: string, changes: Record<string, unknown>) {
  realtimeServer.broadcastProduct(productId, 'product.updated', { productId, changes })
  realtimeServer.broadcastInventory('product.updated', { productId, changes })
}

export function emitReceiptUpdated(data: RealtimeEvents['receipt.updated']) {
  realtimeServer.broadcastInventory('receipt.updated', data)
  realtimeServer.broadcastDashboard('dashboard.updated', { kpis: {} })
}

export function emitDeliveryUpdated(data: RealtimeEvents['delivery.updated']) {
  realtimeServer.broadcastInventory('delivery.updated', data)
  realtimeServer.broadcastDashboard('dashboard.updated', { kpis: {} })
}

export function emitTransferUpdated(data: RealtimeEvents['transfer.updated']) {
  realtimeServer.broadcastInventory('transfer.updated', data)
  realtimeServer.broadcastDashboard('dashboard.updated', { kpis: {} })
}

export function emitAdjustmentUpdated(data: RealtimeEvents['adjustment.updated']) {
  realtimeServer.broadcastInventory('adjustment.updated', data)
  realtimeServer.broadcastDashboard('dashboard.updated', { kpis: {} })
}

export function emitLedgerCreated(data: RealtimeEvents['ledger.created']) {
  realtimeServer.broadcastInventory('ledger.created', data)
  realtimeServer.broadcastDashboard('dashboard.updated', { kpis: {} })
}

export function emitAlertUpdated(data: RealtimeEvents['alert.updated']) {
  realtimeServer.broadcastInventory('alert.updated', data)
  realtimeServer.broadcastDashboard('dashboard.updated', { kpis: {} })
}