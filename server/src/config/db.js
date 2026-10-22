import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'],
    })
  }
  prisma = global.__prisma
}

export default prisma
