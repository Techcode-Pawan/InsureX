import { useState, useEffect } from 'react'

/**
 * Generic data-fetching hook for the API service layer.
 * Usage: const { data, loading, error, refetch } = useFetch(api.getAll)
 */
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      if (result.error) {
        setError(result.error)
      } else {
        setData(result.data)
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, refetch: load }
}
