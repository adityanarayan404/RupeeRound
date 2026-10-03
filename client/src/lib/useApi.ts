import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type ApiError } from './api'

// Tiny stale-while-revalidate cache: screens show the last data instantly and
// refresh in the background; skeletons only appear on the very first load.
const cache = new Map<string, unknown>()
const listeners = new Set<(prefixes: string[]) => void>()

/** Refetch every mounted query whose path starts with one of the prefixes. */
export function invalidate(...prefixes: string[]): void {
  listeners.forEach((listener) => listener(prefixes))
}

export function clearApiCache(): void {
  cache.clear()
}

export interface ApiQuery<T> {
  data: T | undefined
  error: ApiError | null
  /** True only while there is no data to show yet. */
  loading: boolean
  reload: () => Promise<void>
}

export function useApi<T>(path: string | null): ApiQuery<T> {
  const [data, setData] = useState<T | undefined>(() => (path ? (cache.get(path) as T | undefined) : undefined))
  const [error, setError] = useState<ApiError | null>(null)
  const [fetching, setFetching] = useState(Boolean(path))
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (!path) return
    const id = ++requestId.current
    setFetching(true)
    try {
      const result = await api<T>(path)
      cache.set(path, result)
      if (id === requestId.current) {
        setData(result)
        setError(null)
      }
    } catch (caught) {
      if (id === requestId.current) setError(caught as ApiError)
    } finally {
      if (id === requestId.current) setFetching(false)
    }
  }, [path])

  useEffect(() => {
    setData(path ? (cache.get(path) as T | undefined) : undefined)
    void load()
  }, [path, load])

  useEffect(() => {
    if (!path) return
    const listener = (prefixes: string[]) => {
      if (prefixes.some((prefix) => path.startsWith(prefix))) void load()
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [path, load])

  return { data, error, loading: fetching && data === undefined, reload: load }
}

/** Everything that changes after a payment, top-up or investment. */
export function invalidateMoney(): void {
  invalidate('/wallet', '/transactions', '/portfolio', '/goals', '/investments', '/funds', '/advisor')
}
