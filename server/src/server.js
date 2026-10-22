import app from './app.js'
import { env } from './config/env.js'
import prisma from './config/db.js'

const server = app.listen(env.PORT, () => {
  console.log(`====================================================`)
  console.log(`🚀 InsureX Insurance Management Server is running!`)
  console.log(`📡 URL: http://localhost:${env.PORT}`)
  console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`)
  console.log(`🌍 Environment: ${env.NODE_ENV}`)
  console.log(`🔗 Client Origin: ${env.CLIENT_URL}`)
  console.log(`====================================================`)
})

// Graceful shutdown handlers
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`)
  server.close(async () => {
    try {
      await prisma.$disconnect()
      console.log('✅ PostgreSQL / Prisma connection disconnected.')
      process.exit(0)
    } catch (err) {
      console.error('Error during database disconnect:', err)
      process.exit(1)
    }
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
