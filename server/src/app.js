import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import apiRouter from './routes/index.js'
import { errorHandler, AppError } from './middleware/errorHandler.js'

const app = express()

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// CORS configuration
app.use(cors({
  // Production: only the configured client. Development: any localhost port (Vite may move ports).
  origin: (origin, cb) => {
    if (!origin || origin === env.CLIENT_URL) return cb(null, true)
    if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true)
    cb(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Lets the browser read the download filename for authorised document downloads
  exposedHeaders: ['Content-Disposition'],
}))

// Request parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
}

// Mount REST API
app.use('/api', apiRouter)

// 404 Fallback for unhandled endpoints
app.all('*', (req, res, next) => {
  next(new AppError(`Endpoint '${req.originalUrl}' not found on this server.`, 404))
})

// Centralized error handler
app.use(errorHandler)

export default app
