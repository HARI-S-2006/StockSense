import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const httpServer = createServer(app)

app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
app.use(express.json())

const io = new Server(httpServer, {
  path: '/api/socket',
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)
  
  socket.on('subscribe:inventory', () => {
    socket.join('inventory')
  })

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

// Internal endpoint for Next.js to trigger socket events
app.post('/internal/emit', (req, res) => {
  const { event, data } = req.body
  if (!event) return res.status(400).json({ error: 'Missing event' })
  
  io.to('inventory').emit(event, data)
  res.json({ success: true })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Socket Server' })
})

const PORT = 4000
httpServer.listen(PORT, () => {
  console.log(`🚀 Dedicated Socket/Proxy Server running on http://localhost:${PORT}`)
})
