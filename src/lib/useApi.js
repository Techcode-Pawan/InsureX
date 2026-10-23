import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/apiClient'

/**
 * Loads `endpoint` (with optional query params) from the API and tracks loading/error state.
 * Pass `null` as the endpoint to skip loading. Returns
 *   { data, body, loading, refreshing, error, reload, lastUpdated }
 * `data` is body.data; `body` is the full JSON response (for pagination fields).
 *
 * options.pollMs  – refetch on an interval while the browser tab is visible (paused when hidden,
 *                   refreshed on return). This is periodic refresh, not a live push connection.
 *
 * Changing the endpoint/params or unmounting cancels the in-flight request, so a slow response
 * for an old filter can never overwrite newer data. Background refreshes keep showing the
 * previous data (`refreshing` is true) instead of flashing a skeleton.
 */
export function useApi(endpoint, params = {}, { pollMs = 0 } = {}) {
  const [body, setBody] = useState(null)
  const [loading, setLoading] = useState(Boolean(endpoint))
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const key = endpoint ? `${endpoint}?${JSON.stringify(params)}` : null
  const controllerRef = useRef(null)
  const hasDataRef = useRef(false)

  const load = useCallback(async ({ background = false } = {}) => {
    if (!endpoint) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    if (background && hasDataRef.current) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await api.get(endpoint, params, { signal: controller.signal })
      if (controller.signal.aborted) return
      setBody(res.data)
      hasDataRef.current = true
      setLastUpdated(new Date())
    } catch (err) {
      if (err.isCancelled || controller.signal.aborted) return
      setError(err)
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false)
        setRefreshing(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // New endpoint/params: clear previous data flag so a filter change shows a loading state
  useEffect(() => {
    hasDataRef.current = false
    load()
    return () => controllerRef.current?.abort()
  }, [load])

  useEffect(() => {
    if (!pollMs || !endpoint) return undefined
    let timer = null
    const start = () => { if (!timer) timer = setInterval(() => load({ background: true }), pollMs) }
    const stop = () => { clearInterval(timer); timer = null }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { load({ background: true }); start() } else stop()
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [pollMs, endpoint, load])

  const reload = useCallback(() => load({ background: true }), [load])

  return { data: body?.data ?? null, body, loading, refreshing, error, reload, lastUpdated }
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
