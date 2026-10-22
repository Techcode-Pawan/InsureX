import { Router } from 'express'
import * as applicationController from '../controllers/applicationController.js'
import { validate } from '../middleware/validate.js'
import {
  applicationSchema,
  applicationApproveSchema,
  applicationRejectSchema,
} from '../validators/schemas.js'

const router = Router()

router.get('/', applicationController.getApplications)
router.get('/:id', applicationController.getApplicationById)
router.post('/', validate({ body: applicationSchema }), applicationController.createApplication)
router.put('/:id', validate({ body: applicationSchema.partial() }), applicationController.updateApplication)
router.post('/:id/approve', validate({ body: applicationApproveSchema }), applicationController.approveApplication)
router.post('/:id/reject', validate({ body: applicationRejectSchema }), applicationController.rejectApplication)

export default router
