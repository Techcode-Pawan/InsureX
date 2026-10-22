import * as renewalService from '../services/renewalService.js'

export async function getRenewals(req, res, next) {
  try {
    const renewals = await renewalService.getRenewals(req.query)
    res.json({ success: true, data: renewals })
  } catch (err) {
    next(err)
  }
}

export async function createRenewal(req, res, next) {
  try {
    const renewal = await renewalService.createRenewal(req.body)
    res.status(201).json({
      success: true,
      message: 'Policy renewal scheduled successfully.',
      data: renewal,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateRenewal(req, res, next) {
  try {
    const renewal = await renewalService.updateRenewal(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Policy renewal updated successfully.',
      data: renewal,
    })
  } catch (err) {
    next(err)
  }
}
