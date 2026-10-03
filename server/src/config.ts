import path from 'node:path'
import { fileURLToPath } from 'node:url'

const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env')
try {
  process.loadEnvFile(envFile)
} catch {
  // No server/.env: rely on real environment variables (e.g. on Render).
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy server/.env.example to server/.env and fill it in.`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:8443')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  demoOtp: process.env.DEMO_OTP ?? '123456',
  navCacheMs: Number(process.env.NAV_CACHE_HOURS ?? 6) * 60 * 60 * 1000,
  /** Optional: without a key, fund suggestions use the built-in template explanation. */
  groqApiKey: process.env.GROQ_API_KEY || null,
  groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
}
