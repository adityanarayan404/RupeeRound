import { PHONE_REGEX, PIN_REGEX } from '@rupeeround/shared'
import { z } from 'zod'

export const phoneField = z.string().trim().regex(PHONE_REGEX, 'Enter a valid 10-digit mobile number')
export const pinField = z.string().regex(PIN_REGEX, 'PIN must be 4 digits')
export const objectIdField = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
export const isoDateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use yyyy-mm-dd')
