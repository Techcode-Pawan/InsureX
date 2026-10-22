import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from './errorHandler.js'
import prisma from '../config/db.js'

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token missing or invalid.', 401)
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
      },
    })

    if (!user || !user.isActive) {
      throw new AppError('User account not found or has been deactivated.', 401)
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new AppError('Invalid or expired authentication token.', 401))
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
