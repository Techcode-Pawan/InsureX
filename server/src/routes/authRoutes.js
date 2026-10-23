import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from '../controllers/authController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { registerSchema, loginSchema, changePasswordSchema } from '../validators/schemas.js'

const isTest = process.env.NODE_ENV === 'test'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Please try again in 15 minutes.' },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts. Please try again later.' },
})

const router = Router()

router.post('/register', registerLimiter, validate({ body: registerSchema }), authController.register)
router.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login)
router.get('/me', authenticate, authController.getMe)
router.post('/logout', authenticate, authController.logout)
router.post('/change-password', authenticate, loginLimiter, validate({ body: changePasswordSchema }), authController.changePassword)

export default router
