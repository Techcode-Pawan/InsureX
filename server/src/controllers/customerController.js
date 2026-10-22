import * as customerService from '../services/customerService.js'

export async function getCustomers(req, res, next) {
  try {
    const result = await customerService.getCustomers(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getCustomerById(req, res, next) {
  try {
    const customer = await customerService.getCustomerById(req.params.id)
    res.json({ success: true, data: customer })
  } catch (err) {
    next(err)
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = await customerService.createCustomer(req.body)
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
      data: customer,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Customer record updated successfully.',
      data: customer,
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    await customerService.deleteCustomer(req.params.id)
    res.json({
      success: true,
      message: 'Customer record deleted successfully.',
    })
  } catch (err) {
    next(err)
  }
}
