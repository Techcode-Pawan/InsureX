// Records business events: an audit-trail ActivityLog row plus in-app notifications
// for the users who are entitled to hear about the event.
import prisma from '../config/db.js'

async function customerUserId(client, customerId) {
  if (!customerId) return null
  const c = await client.customer.findUnique({ where: { id: customerId }, select: { userId: true } })
  return c?.userId || null
}

async function agentUserId(client, agentId) {
  if (!agentId) return null
  const a = await client.insuranceAgent.findUnique({ where: { id: agentId }, select: { userId: true } })
  return a?.userId || null
}

/**
 * @param {object} e
 * @param {object} [e.actor]         req.user of whoever caused the event
 * @param {string} e.action          e.g. APPLICATION_APPROVED
 * @param {string} e.entityType
 * @param {string} e.entityId
 * @param {string} [e.customerId]    owning customer (scopes visibility)
 * @param {string} [e.agentId]       servicing agent (scopes visibility)
 * @param {string} e.summary         neutral text safe for admins
 * @param {object} [e.notifyCustomer] { title, message, link } shown to the customer
 * @param {object} [e.notifyAgent]    { title, message, link } shown to the agent
 */
export async function recordEvent(e, client = prisma) {
  await client.activityLog.create({
    data: {
      actorUserId: e.actor?.id || null,
      actorRole: e.actor?.role || null,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      customerId: e.customerId || null,
      agentId: e.agentId || null,
      summary: e.summary,
    },
  })

  const notifications = []
  if (e.notifyCustomer) {
    const uid = await customerUserId(client, e.customerId)
    if (uid && uid !== e.actor?.id) notifications.push({ userId: uid, type: e.action, ...e.notifyCustomer })
  }
  if (e.notifyAgent) {
    const uid = await agentUserId(client, e.agentId)
    if (uid && uid !== e.actor?.id) notifications.push({ userId: uid, type: e.action, ...e.notifyAgent })
  }
  if (notifications.length) {
    await client.notification.createMany({ data: notifications })
  }
}
