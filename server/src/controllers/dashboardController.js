import * as dashboardService from '../services/dashboardService.js'

export async function getSummary(req, res, next) {
  try {
    const summary = await dashboardService.getDashboardSummary()
    res.json({ success: true, data: summary })
  } catch (err) {
    next(err)
  }
}

export async function getAnalytics(req, res, next) {
  try {
    const analytics = await dashboardService.getDashboardAnalytics()
    res.json({ success: true, data: analytics })
  } catch (err) {
    next(err)
  }
}

export async function getReportPolicies(req, res, next) {
  try {
    const data = await dashboardService.getReportPolicies()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getReportPremiums(req, res, next) {
  try {
    const data = await dashboardService.getReportPremiums()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getReportClaims(req, res, next) {
  try {
    const data = await dashboardService.getReportClaims()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getReportSummary(req, res, next) {
  try {
    const data = await dashboardService.getReportSummary()
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
