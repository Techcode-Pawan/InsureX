import { Router } from 'express'
import * as dashboardController from '../controllers/dashboardController.js'

const router = Router()

router.get('/summary', dashboardController.getSummary)
router.get('/analytics', dashboardController.getAnalytics)

export default router
