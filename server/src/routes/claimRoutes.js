import { Router } from 'express'
import * as claimController from '../controllers/claimController.js'
import { validate } from '../middleware/validate.js'
import {
  claimSchema,
  claimAssignSchema,
  claimApproveSchema,
  claimRejectSchema,
  claimSettleSchema,
} from '../validators/schemas.js'

const router = Router()

router.get('/', claimController.getClaims)
router.get('/:id', claimController.getClaimById)
router.post('/', validate({ body: claimSchema }), claimController.createClaim)
router.post('/:id/assign', validate({ body: claimAssignSchema }), claimController.assignClaim)
router.post('/:id/approve', validate({ body: claimApproveSchema }), claimController.approveClaim)
router.post('/:id/reject', validate({ body: claimRejectSchema }), claimController.rejectClaim)
router.post('/:id/settle', validate({ body: claimSettleSchema }), claimController.settleClaim)

export default router
