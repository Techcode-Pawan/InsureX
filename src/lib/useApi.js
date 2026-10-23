import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/apiClient'

/**
 * Loads `endpoint` (with optional query params) from the API and tracks loading/error state.
 * Pass `null` as the endpoint to skip loading. Returns { data, body, loading, error, reload }.
 * `data` is body.data; `body` is the full JSON response (for pagination fields).
 */
export function useApi(endpoint, params = {}) {
  const [body, setBody] = useState(null)
  const [loading, setLoading] = useState(Boolean(endpoint))
  const [error, setError] = useState(null)
  const key = endpoint ? `${endpoint}?${JSON.stringify(params)}` : null
  const latest = useRef(0)

  const load = useCallback(async () => {
    if (!endpoint) return
    const ticket = ++latest.current
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(endpoint, params)
      if (ticket === latest.current) setBody(res.data)
    } catch (err) {
      if (ticket === latest.current) setError(err)
    } finally {
      if (ticket === latest.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    load()
  }, [load])

  return { data: body?.data ?? null, body, loading, error, reload: load }
}

// Runs a mutating request and tracks its pending/error state.
export function useAction() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const run = useCallback(async (fn) => {
    setPending(true)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setPending(false)
    }
  }, [])
  return { run, pending, error, setError }
}
