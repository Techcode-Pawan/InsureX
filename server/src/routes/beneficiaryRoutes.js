import { Router } from 'express'
import * as beneficiaryController from '../controllers/beneficiaryController.js'
import { validate } from '../middleware/validate.js'
import { beneficiarySchema, uuidParam } from '../validators/schemas.js'

const router = Router()

router.get('/', beneficiaryController.getBeneficiaries)
router.post('/', validate({ body: beneficiarySchema }), beneficiaryController.createBeneficiary)
router.put('/:id', validate({ params: uuidParam, body: beneficiarySchema.partial() }), beneficiaryController.updateBeneficiary)
router.delete('/:id', validate({ params: uuidParam }), beneficiaryController.deleteBeneficiary)

export default router
