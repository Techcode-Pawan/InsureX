import { Router } from 'express'
import prisma from '../config/db.js'
import { authenticate, authorize } from '../middleware/auth.js'
import authRoutes from './authRoutes.js'
import customerRoutes from './customerRoutes.js'
import policyTypeRoutes from './policyTypeRoutes.js'
import policyRoutes from './policyRoutes.js'
import applicationRoutes from './applicationRoutes.js'
import premiumRoutes from './premiumRoutes.js'
import paymentRoutes from './paymentRoutes.js'
import claimRoutes from './claimRoutes.js'
import claimProcessingRoutes from './claimProcessingRoutes.js'
import agentRoutes from './agentRoutes.js'
import beneficiaryRoutes from './beneficiaryRoutes.js'
import documentRoutes from './documentRoutes.js'
import renewalRoutes from './renewalRoutes.js'
import companyRoutes from './companyRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import reportRoutes from './reportRoutes.js'
import adminRoutes from './adminRoutes.js'
import customerPortalRoutes from './customerPortalRoutes.js'
import agentWorkspaceRoutes from './agentWorkspaceRoutes.js'
import notificationRoutes from './notificationRoutes.js'
import catalogRoutes from './catalogRoutes.js'

const apiRouter = Router()

// ── Public ────────────────────────────────────────────────────
// Health check (includes live database connectivity test)
apiRouter.get('/health', async (req, res) => {
  let dbStatus = 'disconnected'
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    dbStatus = 'connected'
  } catch {
    dbStatus = 'unreachable'
  }
  res.json({
    status: 'online',
    system: 'InsureX Insurance Management System API',
    version: '1.1.0',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  })
})

apiRouter.use('/auth', authRoutes)
apiRouter.use('/catalog', catalogRoutes)

// ── Role-scoped experiences ───────────────────────────────────
apiRouter.use('/me', customerPortalRoutes)          // CUSTOMER: own records only
apiRouter.use('/agent', agentWorkspaceRoutes)       // AGENT: assigned book only
apiRouter.use('/notifications', notificationRoutes) // any signed-in user: own notifications

// ── Administration (system-wide). Every route below requires an ADMIN login. ──
const adminOnly = [authenticate, authorize('ADMIN')]
apiRouter.use('/admin', adminOnly, adminRoutes)
apiRouter.use('/customers', adminOnly, customerRoutes)
apiRouter.use('/policy-types', adminOnly, policyTypeRoutes)
apiRouter.use('/policies', adminOnly, policyRoutes)
apiRouter.use('/applications', adminOnly, applicationRoutes)
apiRouter.use('/premiums', adminOnly, premiumRoutes)
apiRouter.use('/payments', adminOnly, paymentRoutes)
apiRouter.use('/claims', adminOnly, claimRoutes)
apiRouter.use('/claim-processing', adminOnly, claimProcessingRoutes)
apiRouter.use('/agents', adminOnly, agentRoutes)
apiRouter.use('/beneficiaries', adminOnly, beneficiaryRoutes)
apiRouter.use('/documents', adminOnly, documentRoutes)
apiRouter.use('/renewals', adminOnly, renewalRoutes)
apiRouter.use('/insurance-companies', adminOnly, companyRoutes)
apiRouter.use('/dashboard', adminOnly, dashboardRoutes)
apiRouter.use('/reports', adminOnly, reportRoutes)

export default apiRouter
