import * as agentService from '../services/agentService.js'

export async function getAgents(req, res, next) {
  try {
    const agents = await agentService.getAgents(req.query)
    res.json({ success: true, data: agents })
  } catch (err) {
    next(err)
  }
}

export async function getAgentById(req, res, next) {
  try {
    const agent = await agentService.getAgentById(req.params.id)
    res.json({ success: true, data: agent })
  } catch (err) {
    next(err)
  }
}

export async function createAgent(req, res, next) {
  try {
    const { agent, invitation } = await agentService.createAgent(req.body, req.user)
    res.status(201).json({
      success: true,
      message: invitation
        ? 'Agent created. Share the one-time setup link so they can choose a password.'
        : 'Agent created with the temporary password you set.',
      data: { ...agent, invitation },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateAgent(req, res, next) {
  try {
    const agent = await agentService.updateAgent(req.params.id, req.body, req.user)
    res.json({
      success: true,
      message: 'Agent record updated.',
      data: agent,
    })
  } catch (err) {
    next(err)
  }
}

export async function issueAccessLink(req, res, next) {
  try {
    const link = await agentService.issueAgentAccessLink(req.params.id, req.user)
    res.json({ success: true, message: 'One-time link generated. It is shown only once.', data: link })
  } catch (err) {
    next(err)
  }
}
