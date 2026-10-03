import type { ApiErrorBody } from '@rupeeround/shared'
import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../utils/http.ts'

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new HttpError(404, 'not_found', 'This API route does not exist.'))
}

export function errorHandler(error: unknown, _req: Request, res: Response<ApiErrorBody>, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }

  // Malformed JSON body from express.json()
  if (typeof error === 'object' && error && 'type' in error && error.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'invalid_json', message: 'Request body is not valid JSON.' } })
    return
  }

  // Duplicate key, e.g. registering the same phone twice at once
  if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
    res.status(409).json({ error: { code: 'duplicate', message: 'That already exists.' } })
    return
  }

  console.error(error)
  res.status(500).json({ error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } })
}
