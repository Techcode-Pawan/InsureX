import { Router } from 'express'
import * as premiumController from '../controllers/premiumController.js'

const router = Router()

router.get('/', premiumController.getPremiums)
router.get('/:id', premiumController.getPremiumById)

export default router
