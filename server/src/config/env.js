import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const NODE_ENV = process.env.NODE_ENV || 'development'

// Never fall back to a well-known signing secret outside local development/test.
if (!process.env.JWT_SECRET && NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production.')
}

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'insurex_local_dev_only_secret_do_not_use_in_production',
  // Short-lived sessions; logout and password changes revoke earlier tokens via User.tokenVersion.
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/insurex_db?schema=public',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  // Name of a configured online payment provider. Empty = no gateway; payments are submitted for manual verification.
  PAYMENT_GATEWAY_PROVIDER: process.env.PAYMENT_GATEWAY_PROVIDER || '',
  // Prisma interactive transaction limits (ms); generous defaults suit remote databases such as Neon.
  DB_TX_MAX_WAIT_MS: Number(process.env.DB_TX_MAX_WAIT_MS) || 10000,
  DB_TX_TIMEOUT_MS: Number(process.env.DB_TX_TIMEOUT_MS) || 20000,
}
