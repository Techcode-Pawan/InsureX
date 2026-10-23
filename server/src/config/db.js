import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

// Interactive-transaction limits. Prisma's defaults (wait 2s for a connection, 5s to finish) are
// too tight for a remote/cloud database: at ~300 ms per round trip a policy approval needs more
// than 5s and failed with P2028 "Transaction not found". Override via env if needed.
const transactionOptions = {
  maxWait: env.DB_TX_MAX_WAIT_MS,
  timeout: env.DB_TX_TIMEOUT_MS,
}

let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ transactionOptions })
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'],
      transactionOptions,
    })
  }
  prisma = global.__prisma
}

export default prisma
