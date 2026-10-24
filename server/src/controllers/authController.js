import * as authService from '../services/authService.js'

export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body)
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body)
    res.json({
      success: true,
      message: 'Login successful.',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id)
    res.json({
      success: true,
      data: user,
    })
  } catch (err) {
    next(err)
  }
}

export async function logout(req, res, next) {
  try {
    await authService.revokeSessions(req.user.id)
    res.json({ success: true, message: 'Signed out.' })
  } catch (err) {
    next(err)
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.user.id, req.body)
    res.json({ success: true, message: 'Password updated. Other sessions have been signed out.', data: result })
  } catch (err) {
    next(err)
  }
}

export async function inspectSetup(req, res, next) {
  try {
    res.json({ success: true, data: await authService.inspectSetupToken(req.body.token) })
  } catch (err) {
    next(err)
  }
}

export async function completeSetup(req, res, next) {
  try {
    const result = await authService.completePasswordSetup(req.body)
    res.json({ success: true, message: 'Password set. You can now sign in.', data: result })
  } catch (err) {
    next(err)
  }
}
