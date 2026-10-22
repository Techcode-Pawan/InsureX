import * as beneficiaryService from '../services/beneficiaryService.js'

export async function getBeneficiaries(req, res, next) {
  try {
    const list = await beneficiaryService.getBeneficiaries(req.query)
    res.json({ success: true, data: list })
  } catch (err) {
    next(err)
  }
}

export async function createBeneficiary(req, res, next) {
  try {
    const ben = await beneficiaryService.createBeneficiary(req.body)
    res.status(201).json({
      success: true,
      message: 'Beneficiary linked to policy successfully.',
      data: ben,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateBeneficiary(req, res, next) {
  try {
    const ben = await beneficiaryService.updateBeneficiary(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Beneficiary allocation updated.',
      data: ben,
    })
  } catch (err) {
    next(err)
  }
}

export async function deleteBeneficiary(req, res, next) {
  try {
    await beneficiaryService.deleteBeneficiary(req.params.id)
    res.json({
      success: true,
      message: 'Beneficiary removed.',
    })
  } catch (err) {
    next(err)
  }
}
