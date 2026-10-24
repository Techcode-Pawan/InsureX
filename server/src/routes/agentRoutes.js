import { Router } from 'express'
import * as agentController from '../controllers/agentController.js'
import { validate } from '../middleware/validate.js'
import { agentCreateSchema, agentUpdateSchema, uuidParam } from '../validators/schemas.js'

// Mounted under ADMIN-only middleware in routes/index.js.
const router = Router()

router.get('/', agentController.getAgents)
router.get('/:id', validate({ params: uuidParam }), agentController.getAgentById)
router.post('/', validate({ body: agentCreateSchema }), agentController.createAgent)
router.put('/:id', validate({ params: uuidParam, body: agentUpdateSchema }), agentController.updateAgent)
router.post('/:id/access-link', validate({ params: uuidParam }), agentController.issueAccessLink)

export default router
