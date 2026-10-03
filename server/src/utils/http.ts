import type { z } from 'zod'

export class HttpError extends Error {
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

/** Validates a request body/query against a zod schema, or responds 400. */
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const first = result.error.issues[0]
    const field = first?.path.join('.')
    const message = first ? (field ? `${field}: ${first.message}` : first.message) : 'Invalid input'
    throw new HttpError(400, 'invalid_input', message, result.error.issues)
  }
  return result.data
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

/** yyyy-mm-dd in Indian time, so a 1 a.m. payment counts for the right day. */
export function toIndiaDate(date: Date): string {
  return toIsoDate(new Date(date.getTime() + IST_OFFSET_MS))
}
