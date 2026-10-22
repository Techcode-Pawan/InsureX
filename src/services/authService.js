// ============================================================
// InsureX Frontend Authentication Service
// Communicates with Express + PostgreSQL backend /api/auth
// ============================================================

import api from './apiClient'

const STORAGE_KEY_USER = 'insurex_user'
const STORAGE_KEY_TOKEN = 'insurex_token'

export const authService = {
  /**
   * Log in user with email and password
   */
  async login({ email, password }) {
    try {
      const response = await api.post('/auth/login', { email, password })
      if (response && response.data && response.data.success) {
        const { user, token } = response.data.data
        api.setToken(token)
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
        return { success: true, user, token }
      }
      throw new Error(response.data?.message || 'Login failed')
    } catch (err) {
      // Check for demo mock fallback if backend is offline
      if (err.message && err.message.includes('Failed to fetch')) {
        console.warn('Backend unavailable, attempting demo credentials check')
        if ((email === 'admin@gmail.com' && password === 'Admin@123') || (email === 'admin@insurex.in' && password === 'Password123!')) {
          const mockUser = {
            id: 'admin-executive-id',
            name: 'Executive Administrator',
            email: 'admin@gmail.com',
            role: 'ADMIN',
            phone: '+91 98200 45678',
          }
          const mockToken = 'mock_admin_jwt_token'
          api.setToken(mockToken)
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser))
          return { success: true, user: mockUser, token: mockToken, isDemo: true }
        }
        if ((email === 'agent@gmail.com' && password === 'Agent@123') || (email === 'rajesh.kapoor@insurex.in' && password === 'Password123!')) {
          const mockUser = {
            id: 'agent-advisor-id',
            name: 'Rajesh Kapoor (Agent)',
            email: 'agent@gmail.com',
            role: 'AGENT',
            phone: '+91 98201 11223',
          }
          const mockToken = 'mock_agent_jwt_token'
          api.setToken(mockToken)
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser))
          return { success: true, user: mockUser, token: mockToken, isDemo: true }
        }
      }
      throw err
    }
  },

  /**
   * Register a new user
   */
  async register({ email, password, name, phone, role = 'CUSTOMER' }) {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        name,
        phone,
        role,
      })
      if (response && response.data && response.data.success) {
        const { user, token } = response.data.data
        api.setToken(token)
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
        return { success: true, user, token }
      }
      throw new Error(response.data?.message || 'Registration failed')
    } catch (err) {
      throw err
    }
  },

  /**
   * Get current authenticated user details
   */
  async getMe() {
    try {
      const token = api.getToken()
      if (!token) return null

      const response = await api.get('/auth/me')
      if (response && response.data && response.data.success) {
        const user = response.data.data
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
        return user
      }
      return this.getCachedUser()
    } catch (err) {
      return this.getCachedUser()
    }
  },

  /**
   * Get cached user from localStorage
   */
  getCachedUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USER)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },

  /**
   * Log out and clear state
   */
  logout() {
    api.setToken(null)
    localStorage.removeItem(STORAGE_KEY_USER)
    localStorage.removeItem(STORAGE_KEY_TOKEN)
  },
}

export default authService
