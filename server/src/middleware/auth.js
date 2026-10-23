import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from './errorHandler.js'
import prisma from '../config/db.js'

export function signToken(user) {
  return jwt.sign(
    { userId: user.id, tv: user.tokenVersion ?? 0 },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  )
}

// Verifies the bearer token and loads identity from the database. The role and the
// linked customer/agent profile ids come from PostgreSQL, never from the token or request.
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required.', 401)
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isActive: true,
        tokenVersion: true,
        customer: { select: { id: true, status: true } },
        agent: { select: { id: true, status: true } },
      },
    })

    if (!user || !user.isActive) {
      throw new AppError('Your session is no longer valid. Please sign in again.', 401)
    }
    if ((decoded.tv ?? 0) !== user.tokenVersion) {
      throw new AppError('Your session has ended. Please sign in again.', 401)
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      customerId: user.role === 'CUSTOMER' ? user.customer?.id || null : null,
      agentId: user.role === 'AGENT' ? user.agent?.id || null : null,
    }
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new AppError('Your session has expired. Please sign in again.', 401))
    } else {
      next(err)
    }
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Access forbidden: insufficient privilege for this operation.', 403))
    }

    next()
  }
}

// Customer endpoints need a verified customer profile linked to the signed-in account.
export function requireCustomerProfile(req, res, next) {
  if (!req.user?.customerId) {
    return next(new AppError('Complete your customer profile to access this feature.', 409))
  }
  next()
}

// Agent endpoints need an agent profile linked to the signed-in account by an administrator.
export function requireAgentProfile(req, res, next) {
  if (!req.user?.agentId) {
    return next(new AppError('Your login is not linked to an agent profile yet. Contact an administrator.', 403))
  }
  next()
}
