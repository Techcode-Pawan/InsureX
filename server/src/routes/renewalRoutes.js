import { Router } from 'express'
import * as renewalController from '../controllers/renewalController.js'
import { validate } from '../middleware/validate.js'
import { renewalSchema, renewalUpdateSchema } from '../validators/schemas.js'

const router = Router()

router.get('/', renewalController.getRenewals)
router.post('/', validate({ body: renewalSchema }), renewalController.createRenewal)
router.put('/:id', validate({ body: renewalUpdateSchema }), renewalController.updateRenewal)

export default router
