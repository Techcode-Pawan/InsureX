import { Router } from 'express'
import * as customerController from '../controllers/customerController.js'
import { validate } from '../middleware/validate.js'
import { customerSchema } from '../validators/schemas.js'

const router = Router()

router.get('/', customerController.getCustomers)
router.get('/:id', customerController.getCustomerById)
router.post('/', validate({ body: customerSchema }), customerController.createCustomer)
router.put('/:id', validate({ body: customerSchema.partial() }), customerController.updateCustomer)
router.delete('/:id', customerController.deleteCustomer)

export default router
