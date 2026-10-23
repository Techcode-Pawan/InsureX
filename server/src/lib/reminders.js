// Date-driven reminders: notifies customers (and their agents) about premiums due within 7 days and
// policies expiring within 30 days. Each reminder is created at most once per premium / policy term.
import prisma from '../config/db.js'
import { daysFromNow } from './common.js'
import { refreshOverduePremiums } from '../services/premiumService.js'

async function alreadySent(userId, type, link) {
  return Boolean(await prisma.notification.findFirst({ where: { userId, type, link }, select: { id: true } }))
}

export async function runReminders() {
  await refreshOverduePremiums()
  let created = 0

  const premiums = await prisma.premium.findMany({
    where: { status: { in: ['DUE', 'PARTIALLY_PAID'] }, dueDate: { gte: new Date(), lte: daysFromNow(7) } },
    include: { policy: { include: { customer: { select: { userId: true } } } } },
  })
  for (const p of premiums) {
    const userId = p.policy.customer.userId
    const link = `/user/payments?premium=${p.id}`
    if (!userId || (await alreadySent(userId, 'PREMIUM_DUE_SOON', link))) continue
    await prisma.notification.create({
      data: {
        userId,
        type: 'PREMIUM_DUE_SOON',
        title: 'Premium due soon',
        message: `Premium ${p.premiumNumber} for policy ${p.policy.policyNumber} is due on ${p.dueDate.toISOString().slice(0, 10)}.`,
        link,
      },
    })
    created++
  }

  const policies = await prisma.insurancePolicy.findMany({
    where: { status: 'ACTIVE', expiryDate: { gte: new Date(), lte: daysFromNow(30) } },
    include: { customer: { select: { userId: true, assignedAgent: { select: { userId: true } } } } },
  })
  for (const pol of policies) {
    const expiry = pol.expiryDate.toISOString().slice(0, 10)
    const targets = [
      { userId: pol.customer.userId, link: `/user/policies/${pol.id}?renewal=${expiry}`, message: `Policy ${pol.policyNumber} expires on ${expiry}. You can request a renewal from your portal.` },
      { userId: pol.customer.assignedAgent?.userId, link: `/agent/renewals?policy=${pol.id}&term=${expiry}`, message: `Policy ${pol.policyNumber} expires on ${expiry}. Follow up with the customer about renewal.` },
    ]
    for (const t of targets) {
      if (!t.userId || (await alreadySent(t.userId, 'RENEWAL_DUE_SOON', t.link))) continue
      await prisma.notification.create({ data: { userId: t.userId, type: 'RENEWAL_DUE_SOON', title: 'Renewal coming up', message: t.message, link: t.link } })
      created++
    }
  }
  return created
}
