import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import express from 'express'
import cors from 'cors'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))

// Parse JSON only for non-proxied routes
app.use('/internal', express.json())

// Internal route for Next.js to trigger socket emissions
app.post('/internal/emit', (req, res) => {
  const { event, data } = req.body
  if (event && io) {
    io.to('inventory').emit(event, data)
    res.json({ success: true })
  } else {
    res.status(400).json({ success: false })
  }
})

// Proxy all /api requests (except /api/health which is handled below) to Next.js backend on 3000
app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return res.json({
      status: 'ok',
      service: 'stocksense-api',
      database: 'connected'
    })
  }
  next()
}, createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
}))

const httpServer = createServer(app)

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)

  socket.on('subscribe:dashboard', () => {
    socket.join('dashboard')
  })
  
  socket.on('subscribe:product', (productId: string) => {
    socket.join(`product:${productId}`)
  })

  socket.on('subscribe:warehouse', (warehouseId: string) => {
    socket.join(`warehouse:${warehouseId}`)
  })
  
  // By default join the inventory room to receive all global inventory updates
  socket.join('inventory')

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

const PORT = 4000
httpServer.listen(PORT, () => {
  console.log(`=====================================`)
  console.log(`STOCKSENSE BACKEND`)
  console.log(`==================`)
  console.log(`API: http://localhost:${PORT}`)
  console.log(`Health: http://localhost:${PORT}/api/health`)
  console.log(`Socket.IO: http://localhost:${PORT}`)
  console.log(`Database: PostgreSQL :5432`)
  console.log(`=====================================`)
})
