import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/db.js'
import { env } from '../config/env.js'
import { AppError } from '../middleware/errorHandler.js'

export async function registerUser({ email, password, name, role = 'CUSTOMER', phone }) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError('Email address already registered.', 409)
  }

  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      phone,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  })

  const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })

  return { user, token }
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password.', 401)
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash)
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401)
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  })

  const { passwordHash: _, ...safeUser } = user
  return { user: safeUser, token }
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      isActive: true,
      createdAt: true,
    },
  })
  if (!user) throw new AppError('User not found.', 404)
  return user
}
