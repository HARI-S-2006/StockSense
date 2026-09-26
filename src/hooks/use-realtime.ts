'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface RealtimeEvents {
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
  'connect': void
  'disconnect': void
  'error': Error
}

type EventName = keyof RealtimeEvents
type EventHandler<E extends EventName> = (data: RealtimeEvents[E]) => void

interface UseRealtimeOptions {
  autoConnect?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect, onError } = options
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<Error | null>(null)
  const handlersRef = useRef<Map<EventName, Set<Function>>>(new Map())

  useEffect(() => {
    if (!autoConnect) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
    
    socketRef.current = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('🔌 Real-time connected:', socket.id)
      setIsConnected(true)
      setConnectionError(null)
      onConnect?.()
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Real-time disconnected:', reason)
      setIsConnected(false)
      onDisconnect?.()
    })

    socket.on('connect_error', (error) => {
      console.error('🔌 Real-time connection error:', error)
      setConnectionError(error)
      onError?.(error)
    })

    socket.onAny((eventName: string, data: unknown) => {
      const handlers = handlersRef.current.get(eventName as EventName)
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data)
          } catch (err) {
            console.error(`Error in realtime handler for ${eventName}:`, err)
          }
        })
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [autoConnect, onConnect, onDisconnect, onError])

  const on = useCallback(<E extends EventName>(event: E, handler: (data: RealtimeEvents[E]) => void) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler)

    return () => {
      handlersRef.current.get(event)?.delete(handler)
    }
  }, [])

  const subscribeToProduct = useCallback((productId: string) => {
    socketRef.current?.emit('subscribe:product', productId)
  }, [])

  const unsubscribeFromProduct = useCallback((productId: string) => {
    socketRef.current?.emit('unsubscribe:product', productId)
  }, [])

  const subscribeToWarehouse = useCallback((warehouseId: string) => {
    socketRef.current?.emit('subscribe:warehouse', warehouseId)
  }, [])

  const subscribeToDashboard = useCallback(() => {
    socketRef.current?.emit('subscribe:dashboard')
  }, [])

  const reconnect = useCallback(() => {
    socketRef.current?.connect()
  }, [])

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect()
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    on,
    subscribeToProduct,
    unsubscribeFromProduct,
    subscribeToWarehouse,
    subscribeToDashboard,
    reconnect,
    disconnect,
  }
}

export function useStockUpdates(productId?: string) {
  const [latestUpdate, setLatestUpdate] = useState<any>(null)
  
  const { on } = useRealtime()
  
  useEffect(() => {
    const unsubscribe = on('stock.updated', (data) => {
      if (!productId || data.productId === productId) {
        setLatestUpdate(data)
      }
    })
    return unsubscribe
  }, [on, productId])

  return { latestUpdate }
}

export function useDashboardUpdates() {
  const [kpis, setKpis] = useState<Record<string, number>>({})
  
  const { on, subscribeToDashboard } = useRealtime()
  
  useEffect(() => {
    subscribeToDashboard()
    const unsubscribe = on('dashboard.updated', (data) => {
      setKpis(data.kpis)
    })
    return unsubscribe
  }, [on, subscribeToDashboard])

  return { kpis }
}

export function useLedgerUpdates() {
  const [latestEntry, setLatestEntry] = useState<any>(null)
  
  const { on } = useRealtime()
  
  useEffect(() => {
    const unsubscribe = on('ledger.created', (data) => {
      setLatestEntry(data.entry)
    })
    return unsubscribe
  }, [on])

  return { latestEntry }
}

export function useAlertUpdates() {
  const [latestAlert, setLatestAlert] = useState<any>(null)
  
  const { on } = useRealtime()
  
  useEffect(() => {
    const unsubscribe = on('alert.updated', (data) => {
      setLatestAlert(data)
    })
    return unsubscribe
  }, [on])

  return { latestAlert }
}