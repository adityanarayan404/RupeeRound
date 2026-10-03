import type { ApiErrorBody } from '@rupeeround/shared'
import { storage } from './storage'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const TOKEN_KEY = 'rr.token'

export const tokenStore = {
  get: () => storage.get(TOKEN_KEY),
  set: (token: string) => storage.set(TOKEN_KEY, token),
  clear: () => storage.remove(TOKEN_KEY),
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

let onUnauthorized: (() => void) | null = null

/** Called when the server says the session is gone (expired token, deleted user). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export async function api<T>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get()
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (token) headers.authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network', "Can't reach RupeeRound. Check your connection and try again.")
  }

  if (response.status === 204) return undefined as T
  const data = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    const error = (data as ApiErrorBody | null)?.error
    if (response.status === 401 && error?.code === 'unauthorized') onUnauthorized?.()
    throw new ApiError(
      response.status,
      error?.code ?? 'error',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details,
    )
  }
  return data as T
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
