import * as policyService from '../services/policyService.js'

export async function getPolicies(req, res, next) {
  try {
    const result = await policyService.getPolicies(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getPolicyById(req, res, next) {
  try {
    const policy = await policyService.getPolicyById(req.params.id)
    res.json({ success: true, data: policy })
  } catch (err) {
    next(err)
  }
}

export async function createPolicy(req, res, next) {
  try {
    const policy = await policyService.createPolicy(req.body)
    res.status(201).json({
      success: true,
      message: 'Insurance policy issued successfully.',
      data: policy,
    })
  } catch (err) {
    next(err)
  }
}

export async function updatePolicy(req, res, next) {
  try {
    const policy = await policyService.updatePolicy(req.params.id, req.body, req.user)
    res.json({
      success: true,
      message: 'Policy updated successfully.',
      data: policy,
    })
  } catch (err) {
    next(err)
  }
}

export async function deletePolicy(req, res, next) {
  try {
    await policyService.deletePolicy(req.params.id)
    res.json({
      success: true,
      message: 'Policy deleted successfully.',
    })
  } catch (err) {
    next(err)
  }
}
