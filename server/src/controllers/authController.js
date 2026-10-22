import * as authService from '../services/authService.js'

export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body)
    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
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
