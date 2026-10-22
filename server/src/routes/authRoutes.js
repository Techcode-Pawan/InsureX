import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as authController from '../controllers/authController.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { registerSchema, loginSchema } from '../validators/schemas.js'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
})

const router = Router()

router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register)
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login)
router.get('/me', authenticate, authController.getMe)

export default router
