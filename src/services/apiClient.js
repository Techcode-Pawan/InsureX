// ============================================================
// InsureX Frontend Centralized API Client
// Handles REST communication with the Express + PostgreSQL backend.
// There is no offline/mock mode: if the API is unreachable the UI shows an error
// instead of fabricated data or fake success.
// ============================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'insurex_token'

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || null
    } catch {
      return null
    }
  }

  setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage unavailable: session lasts for this page only */
    }
  }

  authHeader() {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async raw(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000)
    try {
      return await fetch(url, {
        ...options,
        headers: { ...this.authHeader(), ...(options.headers || {}) },
        signal: controller.signal,
      })
    } catch (err) {
      const error = new Error('Unable to reach the InsureX server. Check your connection and try again.')
      error.isNetworkError = true
      error.cause = err
      window.dispatchEvent(new CustomEvent('insurex:api-error', { detail: { url, message: err.message } }))
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async handle(response, endpoint) {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(data.message || `Request failed (${response.status}).`)
      error.status = response.status
      error.errors = data.errors
      error.isApiError = true
      // An expired or revoked session anywhere in the app signs the user out.
      if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
        window.dispatchEvent(new CustomEvent('insurex:unauthorized'))
      }
      throw error
    }
    return { data, isLive: true }
  }

  async request(endpoint, options = {}) {
    const response = await this.raw(endpoint, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    })
    return this.handle(response, endpoint)
  }

  // The third argument is accepted for backwards compatibility with existing callers and ignored.
  get(endpoint, params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString()
    return this.request(query ? `${endpoint}?${query}` : endpoint, { method: 'GET' })
  }

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) })
  }

  put(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) })
  }

  patch(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) })
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }

  // multipart/form-data upload (browser sets the boundary header)
  async upload(endpoint, formData) {
    const response = await this.raw(endpoint, { method: 'POST', body: formData, timeout: 60000 })
    return this.handle(response, endpoint)
  }

  // Authorised file download: fetch with the bearer token, then save via an object URL.
  async download(endpoint, fallbackName = 'document') {
    const response = await this.raw(endpoint, { method: 'GET', timeout: 60000 })
    if (!response.ok) await this.handle(response, endpoint)
    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?([^";]+)"?/)
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = match ? match[1] : fallbackName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  }
}

export const api = new ApiClient()
export default api
