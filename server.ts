import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocketIO } from './src/lib/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.io
  initializeSocketIO(server)

  server.once('error', (err) => {
    console.error(err)
    process.exit(1)
  })

  server.listen(port, () => {
    console.log(`=====================================`)
    console.log(`STOCKSENSE FRONTEND & BACKEND`)
    console.log(`===================`)
    console.log(`Application: http://${hostname}:${port}`)
    console.log(`API: http://${hostname}:${port}/api`)
    console.log(`Health: http://${hostname}:${port}/api/health`)
    console.log(`Socket.IO: http://${hostname}:${port}`)
    console.log(`Database: PostgreSQL :5432`)
    console.log(`=====================================`)
  })
})
