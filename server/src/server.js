import app from './app.js'
import { env } from './config/env.js'
import prisma from './config/db.js'
import { runReminders } from './lib/reminders.js'

// Due-date reminders and overdue status refresh: on start, then every 6 hours.
async function reminderTick() {
  try {
    const n = await runReminders()
    if (n) console.log(`🔔 Created ${n} due-date reminder notification(s).`)
  } catch (err) {
    console.error('Reminder job failed:', err.message)
  }
}
let reminderTimer = null

const server = app.listen(env.PORT, () => {
  console.log(`====================================================`)
  console.log(`🚀 InsureX Insurance Management Server is running!`)
  console.log(`📡 URL: http://localhost:${env.PORT}`)
  console.log(`🩺 Health check: http://localhost:${env.PORT}/api/health`)
  console.log(`🌍 Environment: ${env.NODE_ENV}`)
  console.log(`🔗 Client Origin: ${env.CLIENT_URL}`)
  console.log(`====================================================`)

  // Start background jobs only once this instance actually owns the port.
  reminderTick()
  reminderTimer = setInterval(reminderTick, 6 * 60 * 60 * 1000)
})

// A second copy of the server (e.g. `npm run dev` in another terminal) cannot bind the port.
// Explain that clearly instead of crashing with an unhandled 'error' event stack trace.
server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n✖ Port ${env.PORT} is already in use: another InsureX API (or other program) is already running.`)
    console.error(`  Stop the other instance (Ctrl+C in its terminal) or set a different PORT in server/.env.`)
    console.error(`  Find it in PowerShell:  Get-NetTCPConnection -LocalPort ${env.PORT} -State Listen | Select-Object OwningProcess\n`)
  } else {
    console.error('✖ HTTP server failed to start:', err.message)
  }
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})

// Surface programming errors with context; the process still exits so nothing runs in a bad state.
process.on('unhandledRejection', (reason) => {
  console.error('✖ Unhandled promise rejection:', reason)
  process.exit(1)
})

// Graceful shutdown handlers
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`)
  if (reminderTimer) clearInterval(reminderTimer)
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
