import { Router } from 'express'
import * as agentController from '../controllers/agentController.js'
import { validate } from '../middleware/validate.js'
import { agentSchema } from '../validators/schemas.js'

const router = Router()

router.get('/', agentController.getAgents)
router.get('/:id', agentController.getAgentById)
router.post('/', validate({ body: agentSchema }), agentController.createAgent)
router.put('/:id', validate({ body: agentSchema.partial() }), agentController.updateAgent)

export default router
