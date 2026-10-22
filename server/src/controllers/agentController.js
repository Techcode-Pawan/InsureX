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
    const agent = await agentService.createAgent(req.body)
    res.status(201).json({
      success: true,
      message: 'Agent registered successfully.',
      data: agent,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateAgent(req, res, next) {
  try {
    const agent = await agentService.updateAgent(req.params.id, req.body)
    res.json({
      success: true,
      message: 'Agent record updated.',
      data: agent,
    })
  } catch (err) {
    next(err)
  }
}
