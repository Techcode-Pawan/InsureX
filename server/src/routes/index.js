import { Router } from 'express'
import prisma from '../config/db.js'
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

const apiRouter = Router()

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
    version: '1.0.0',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  })
})

apiRouter.use('/auth', authRoutes)
apiRouter.use('/customers', customerRoutes)
apiRouter.use('/policy-types', policyTypeRoutes)
apiRouter.use('/policies', policyRoutes)
apiRouter.use('/applications', applicationRoutes)
apiRouter.use('/premiums', premiumRoutes)
apiRouter.use('/payments', paymentRoutes)
apiRouter.use('/claims', claimRoutes)
apiRouter.use('/claim-processing', claimProcessingRoutes)
apiRouter.use('/agents', agentRoutes)
apiRouter.use('/beneficiaries', beneficiaryRoutes)
apiRouter.use('/documents', documentRoutes)
apiRouter.use('/renewals', renewalRoutes)
apiRouter.use('/insurance-companies', companyRoutes)
apiRouter.use('/dashboard', dashboardRoutes)
apiRouter.use('/reports', reportRoutes)

export default apiRouter

