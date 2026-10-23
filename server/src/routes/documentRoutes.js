import { Router } from 'express'
import * as documentController from '../controllers/documentController.js'
import { validate } from '../middleware/validate.js'
import { documentSchema } from '../validators/schemas.js'

const router = Router()

router.get('/', documentController.getDocuments)
router.post('/', validate({ body: documentSchema }), documentController.createDocument)
router.put('/:id', validate({ body: documentSchema.partial() }), documentController.updateDocument)
router.get('/:id/download', documentController.downloadDocument)

export default router
