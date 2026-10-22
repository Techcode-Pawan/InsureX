import * as applicationService from '../services/applicationService.js'

export async function getApplications(req, res, next) {
  try {
    const result = await applicationService.getApplications(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getApplicationById(req, res, next) {
  try {
    const application = await applicationService.getApplicationById(req.params.id)
    res.json({ success: true, data: application })
  } catch (err) {
    next(err)
  }
}

export async function createApplication(req, res, next) {
  try {
    const application = await applicationService.createApplication(req.body)
    res.status(201).json({
      success: true,
      message: 'Insurance application submitted successfully.',
      data: application,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateApplication(req, res, next) {
  try {
    const application = await applicationService.updateApplication(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Application updated.',
      data: application,
    })
  } catch (err) {
    next(err)
  }
}

export async function approveApplication(req, res, next) {
  try {
    const result = await applicationService.approveApplication(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Application approved and policy issued successfully.',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function rejectApplication(req, res, next) {
  try {
    const application = await applicationService.rejectApplication(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Application rejected.',
      data: application,
    })
  } catch (err) {
    next(err)
  }
}
