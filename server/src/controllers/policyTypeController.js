import * as policyTypeService from '../services/policyTypeService.js'

export async function getPolicyTypes(req, res, next) {
  try {
    const types = await policyTypeService.getPolicyTypes(req.query)
    res.json({ success: true, data: types })
  } catch (err) {
    next(err)
  }
}

export async function getPolicyTypeById(req, res, next) {
  try {
    const type = await policyTypeService.getPolicyTypeById(req.params.id)
    res.json({ success: true, data: type })
  } catch (err) {
    next(err)
  }
}

export async function createPolicyType(req, res, next) {
  try {
    const type = await policyTypeService.createPolicyType(req.body)
    res.status(201).json({
      success: true,
      message: 'Policy type created successfully.',
      data: type,
    })
  } catch (err) {
    next(err)
  }
}

export async function updatePolicyType(req, res, next) {
  try {
    const type = await policyTypeService.updatePolicyType(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Policy type updated successfully.',
      data: type,
    })
  } catch (err) {
    next(err)
  }
}

export async function deletePolicyType(req, res, next) {
  try {
    await policyTypeService.deletePolicyType(req.params.id)
    res.json({
      success: true,
      message: 'Policy type deleted successfully.',
    })
  } catch (err) {
    next(err)
  }
}
