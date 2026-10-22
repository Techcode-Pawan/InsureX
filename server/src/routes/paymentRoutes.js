import { Router } from 'express'
import * as premiumController from '../controllers/premiumController.js'
import { validate } from '../middleware/validate.js'
import { paymentSchema } from '../validators/schemas.js'

const router = Router()

router.get('/', premiumController.getPayments)
router.post('/', validate({ body: paymentSchema }), premiumController.createPayment)

export default router
