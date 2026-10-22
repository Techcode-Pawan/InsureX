import { Router } from 'express'
import * as policyController from '../controllers/policyController.js'
import { validate } from '../middleware/validate.js'
import { policySchema } from '../validators/schemas.js'

const router = Router()

router.get('/', policyController.getPolicies)
router.get('/:id', policyController.getPolicyById)
router.post('/', validate({ body: policySchema }), policyController.createPolicy)
router.put('/:id', validate({ body: policySchema.partial() }), policyController.updatePolicy)
router.delete('/:id', policyController.deletePolicy)

export default router
