import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { routes } from './routes'

const app = fastify({
  logger: true,
})

// Plugins
app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (like health checks)
    if (!origin) {
      cb(null, true)
      return
    }

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3003',
    ]

    // Allow Railway domains and production domains
    const isRailwayDomain = origin.includes('.railway.app')
    const isProductionDomain = origin.includes('newtractor.com.br')

    if (allowedOrigins.includes(origin) || isRailwayDomain || isProductionDomain) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'tractus-secret-key',
})

// Routes
app.register(routes)

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = process.env.HOST || '0.0.0.0'

    await app.listen({ port, host })
    console.log(`🚀 Tractus API running on http://${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
