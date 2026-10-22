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
  origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Request parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

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
