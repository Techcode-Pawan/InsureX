import { Router } from 'express'
import * as claimController from '../controllers/claimController.js'

const router = Router()

router.get('/', claimController.getProcessingQueue)

export default router
