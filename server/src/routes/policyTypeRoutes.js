import { Router } from 'express'
import * as policyTypeController from '../controllers/policyTypeController.js'
import { validate } from '../middleware/validate.js'
import { policyTypeSchema } from '../validators/schemas.js'

const router = Router()

router.get('/', policyTypeController.getPolicyTypes)
router.get('/:id', policyTypeController.getPolicyTypeById)
router.post('/', validate({ body: policyTypeSchema }), policyTypeController.createPolicyType)
router.put('/:id', validate({ body: policyTypeSchema.partial() }), policyTypeController.updatePolicyType)
router.delete('/:id', policyTypeController.deletePolicyType)

export default router
