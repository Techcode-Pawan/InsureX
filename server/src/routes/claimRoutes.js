import { Router } from 'express'
import * as claimController from '../controllers/claimController.js'
import { validate } from '../middleware/validate.js'
import {
  claimSchema,
  claimAssignSchema,
  claimApproveSchema,
  claimRejectSchema,
  claimSettleSchema,
  uuidParam,
} from '../validators/schemas.js'

const router = Router()

router.get('/', claimController.getClaims)
router.get('/:id', validate({ params: uuidParam }), claimController.getClaimById)
router.post('/', validate({ body: claimSchema }), claimController.createClaim)
router.post('/:id/assign', validate({ params: uuidParam, body: claimAssignSchema }), claimController.assignClaim)
router.post('/:id/approve', validate({ params: uuidParam, body: claimApproveSchema }), claimController.approveClaim)
router.post('/:id/reject', validate({ params: uuidParam, body: claimRejectSchema }), claimController.rejectClaim)
router.post('/:id/settle', validate({ params: uuidParam, body: claimSettleSchema }), claimController.settleClaim)

export default router
