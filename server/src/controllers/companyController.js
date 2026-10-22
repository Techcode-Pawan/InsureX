import * as companyService from '../services/companyService.js'

export async function getCompanies(req, res, next) {
  try {
    const list = await companyService.getCompanies(req.query)
    res.json({ success: true, data: list })
  } catch (err) {
    next(err)
  }
}

export async function getCompanyById(req, res, next) {
  try {
    const company = await companyService.getCompanyById(req.params.id)
    res.json({ success: true, data: company })
  } catch (err) {
    next(err)
  }
}

export async function createCompany(req, res, next) {
  try {
    const company = await companyService.createCompany(req.body)
    res.status(201).json({
      success: true,
      message: 'Insurance company registered successfully.',
      data: company,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateCompany(req, res, next) {
  try {
    const company = await companyService.updateCompany(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Company details updated.',
      data: company,
    })
  } catch (err) {
    next(err)
  }
}
