import * as claimService from '../services/claimService.js'

export async function getClaims(req, res, next) {
  try {
    const result = await claimService.getClaims(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getClaimById(req, res, next) {
  try {
    const claim = await claimService.getClaimById(req.params.id)
    res.json({ success: true, data: claim })
  } catch (err) {
    next(err)
  }
}

export async function createClaim(req, res, next) {
  try {
    const claim = await claimService.createClaim(req.body)
    res.status(201).json({
      success: true,
      message: 'Claim filed successfully.',
      data: claim,
    })
  } catch (err) {
    next(err)
  }
}

export async function assignClaim(req, res, next) {
  try {
    const claim = await claimService.assignClaimAgent(req.params.id, req.body.agentId)
    res.json({
      success: true,
      message: 'Agent assigned to claim successfully.',
      data: claim,
    })
  } catch (err) {
    next(err)
  }
}

export async function approveClaim(req, res, next) {
  try {
    const claim = await claimService.approveClaim(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Claim approved successfully.',
      data: claim,
    })
  } catch (err) {
    next(err)
  }
}

export async function rejectClaim(req, res, next) {
  try {
    const claim = await claimService.rejectClaim(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Claim rejected.',
      data: claim,
    })
  } catch (err) {
    next(err)
  }
}

export async function settleClaim(req, res, next) {
  try {
    const claim = await claimService.settleClaim(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Claim settlement disbursed and finalized.',
      data: claim,
    })
  } catch (err) {
    next(err)
  }
}

export async function getProcessingQueue(req, res, next) {
  try {
    const result = await claimService.getClaimProcessingQueue(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}
