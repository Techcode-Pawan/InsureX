import * as premiumService from '../services/premiumService.js'

export async function getPremiums(req, res, next) {
  try {
    const result = await premiumService.getPremiums(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function getPremiumById(req, res, next) {
  try {
    const premium = await premiumService.getPremiumById(req.params.id)
    res.json({ success: true, data: premium })
  } catch (err) {
    next(err)
  }
}

export async function getPayments(req, res, next) {
  try {
    const result = await premiumService.getPayments(req.query)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

export async function createPayment(req, res, next) {
  try {
    const result = await premiumService.createPayment(req.body)
    res.status(201).json({
      success: true,
      message: 'Premium payment processed successfully.',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}
