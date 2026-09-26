import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { initializeSocketIO } from './socket-server'

const app = express()

app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  credentials: true,
}))

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'stocksense-api', timestamp: new Date().toISOString() })
})

const httpServer = createServer(app)

initializeSocketIO(httpServer)

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
  console.log('=====================================')
  console.log('STOCKSENSE BACKEND')
  console.log('==================')
  console.log(`API: http://localhost:${PORT}`)
  console.log(`Health: http://localhost:${PORT}/api/health`)
  console.log(`Socket.IO: http://localhost:${PORT}`)
  console.log(`Database: PostgreSQL :5432`)
  console.log('=====================================')
})

export { app, httpServer }