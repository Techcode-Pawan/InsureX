import { Router } from 'express'
import * as dashboardController from '../controllers/dashboardController.js'

const router = Router()

router.get('/policies', dashboardController.getReportPolicies)
router.get('/premiums', dashboardController.getReportPremiums)
router.get('/claims', dashboardController.getReportClaims)

export default router
