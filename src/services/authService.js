// ============================================================
// InsureX Frontend Authentication Service
// Communicates with Express + PostgreSQL backend /api/auth
// ============================================================

import api from './apiClient'

const STORAGE_KEY_USER = 'insurex_user'

function cacheUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
  } catch {
    /* ignore */
  }
}

export const authService = {
  // `role` is the portal chosen on the login page; the server checks it against the account's real role.
  async login({ email, password, role }) {
    const response = await api.post('/auth/login', { email, password, role })
    const { user, token } = response.data.data
    api.setToken(token)
    cacheUser(user)
    return { success: true, user, token }
  },

  // Public registration always creates a customer account; the server ignores any role.
  async register({ email, password, name, phone }) {
    const response = await api.post('/auth/register', { email, password, name, phone })
    const { user, token } = response.data.data
    api.setToken(token)
    cacheUser(user)
    return { success: true, user, token }
  },

  async getMe() {
    if (!api.getToken()) return null
    const response = await api.get('/auth/me')
    const user = response.data.data
    cacheUser(user)
    return user
  },

  // The cached user only drives the first paint; the server re-verifies it on load.
  getCachedUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USER)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },

  clearLocal() {
    api.setToken(null)
    try {
      localStorage.removeItem(STORAGE_KEY_USER)
    } catch {
      /* ignore */
    }
  },

  // Revokes the session server-side, then clears local state even if the server is unreachable.
  async logout() {
    try {
      if (api.getToken()) await api.post('/auth/logout')
    } catch {
      /* token already invalid or server offline */
    } finally {
      this.clearLocal()
    }
  },
}

export default authService
