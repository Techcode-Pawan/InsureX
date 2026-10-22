import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import authService from '../services/authService'
import api from '../services/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCachedUser())
  const [token, setTokenState] = useState(() => api.getToken())
  const [isLoading, setIsLoading] = useState(true)

  // Verify and hydrate current user on mount
  useEffect(() => {
    let isMounted = true
    async function initAuth() {
      const existingToken = api.getToken()
      if (existingToken) {
        try {
          const freshUser = await authService.getMe()
          if (isMounted && freshUser) {
            setUser(freshUser)
            setTokenState(existingToken)
          }
        } catch (err) {
          console.warn('[InsureX Auth] Token verification failed:', err)
        }
      }
      if (isMounted) {
        setIsLoading(false)
      }
    }
    initAuth()
    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true)
    try {
      const result = await authService.login({ email, password })
      setUser(result.user)
      setTokenState(result.token)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (formData) => {
    setIsLoading(true)
    try {
      const result = await authService.register(formData)
      setUser(result.user)
      setTokenState(result.token)
      return result
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setTokenState(null)
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    logout,
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
