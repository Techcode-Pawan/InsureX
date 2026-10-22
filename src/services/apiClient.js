// ============================================================
// InsureX Frontend Centralized API Client
// Handles REST communications with Express + PostgreSQL backend
// Features transparent offline mock fallback and token management
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  getToken() {
    return localStorage.getItem('insurex_token') || null
  }

  setToken(token) {
    if (token) localStorage.setItem('insurex_token', token)
    else localStorage.removeItem('insurex_token')
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    }
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  async request(endpoint, options = {}, mockFallback = null) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000) // 4s timeout

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...(options.headers || {}),
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `API Request failed with status ${response.status}`)
      }

      return { data, isLive: true }
    } catch (err) {
      // If server is unreachable or offline, use structured mock fallback if available
      if (mockFallback !== null && mockFallback !== undefined) {
        console.warn(`[InsureX API] Backend service unavailable at ${url}. Operating in local demonstration mode. Details:`, err.message)
        return { data: mockFallback, isLive: false, fallbackNotice: 'Demonstration mode (Backend offline)' }
      }
      throw err
    }
  }

  get(endpoint, params = {}, mockFallback = null) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    const url = query ? `${endpoint}?${query}` : endpoint
    return this.request(url, { method: 'GET' }, mockFallback)
  }

  post(endpoint, body = {}, mockFallback = null) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }, mockFallback)
  }

  put(endpoint, body = {}, mockFallback = null) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, mockFallback)
  }

  delete(endpoint, mockFallback = null) {
    return this.request(endpoint, { method: 'DELETE' }, mockFallback)
  }
}

export const api = new ApiClient()
export default api
