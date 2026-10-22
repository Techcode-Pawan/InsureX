import { Router } from 'express'
import * as companyController from '../controllers/companyController.js'
import { validate } from '../middleware/validate.js'
import { companySchema } from '../validators/schemas.js'

const router = Router()

router.get('/', companyController.getCompanies)
router.get('/:id', companyController.getCompanyById)
router.post('/', validate({ body: companySchema }), companyController.createCompany)
router.put('/:id', validate({ body: companySchema.partial() }), companyController.updateCompany)

export default router
