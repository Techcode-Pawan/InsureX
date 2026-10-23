import { useContext, useState, useEffect, useCallback } from 'react'
import authService from '../services/authService'
import api from '../services/apiClient'
import { AuthContext } from './authContextObject'

export const ROLE_HOME = { ADMIN: '/admin', AGENT: '/agent', CUSTOMER: '/user' }

export function homeFor(user) {
  if (!user) return '/login'
  if (user.role === 'CUSTOMER' && !user.profileComplete) return '/user/onboarding'
  return ROLE_HOME[user.role] || '/login'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (api.getToken() ? authService.getCachedUser() : null))
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    authService.clearLocal()
    setUser(null)
  }, [])

  // Verify the stored token with the server on load. Never trust the cached role alone.
  useEffect(() => {
    let isMounted = true
    async function initAuth() {
      try {
        const freshUser = await authService.getMe()
        if (isMounted) setUser(freshUser)
      } catch (err) {
        if (isMounted && err.status === 401) clearSession()
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    initAuth()
    return () => {
      isMounted = false
    }
  }, [clearSession])

  // Any 401 from the API (expired/revoked token) ends the session.
  useEffect(() => {
    const onUnauthorized = () => clearSession()
    window.addEventListener('insurex:unauthorized', onUnauthorized)
    return () => window.removeEventListener('insurex:unauthorized', onUnauthorized)
  }, [clearSession])

  const login = useCallback(async ({ email, password }) => {
    const result = await authService.login({ email, password })
    setUser(result.user)
    return result
  }, [])

  const register = useCallback(async (formData) => {
    const result = await authService.register(formData)
    setUser(result.user)
    return result
  }, [])

  const refreshUser = useCallback(async () => {
    const fresh = await authService.getMe()
    setUser(fresh)
    return fresh
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const value = {
    user,
    isAuthenticated: Boolean(user && api.getToken()),
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
