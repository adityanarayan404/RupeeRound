// Thin wrapper around Groq's OpenAI-compatible chat API. Never throws and never
// logs the API key: callers get the reply, or null if anything went wrong.
import { config } from '../config.ts'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export interface GroqToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** OpenAI-style chat messages, including tool calls and tool results. */
export type GroqMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: GroqToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** A function the model may ask us to run, described with a JSON schema. */
export interface GroqTool {
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

interface GroqOptions {
  messages: GroqMessage[]
  maxTokens: number
  temperature: number
  timeoutMs: number
  /** Short label used in warning logs, e.g. "explanation" or "assistant". */
  label: string
  tools?: GroqTool[]
  /** 'none' forces a plain text answer even when tools are listed. */
  toolChoice?: 'auto' | 'none'
}

interface GroqResponse {
  choices?: { message?: { content?: string | null; tool_calls?: GroqToolCall[] } }[]
}

export interface GroqReply {
  content: string
  toolCalls: GroqToolCall[]
}

export function groqConfigured(): boolean {
  return Boolean(config.groqApiKey)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * One chat completion. If Groq says we're over its rate limit (HTTP 429) and asks us
 * to wait a few seconds, waits once and retries, as long as that fits in the time budget.
 */
export async function groqChat(options: GroqOptions): Promise<GroqReply | null> {
  const started = Date.now()
  const first = await groqChatOnce(options)
  if (first !== 'rate-limited') return first
  const waitMs = lastRetryAfterMs ?? 2000
  if (waitMs > options.timeoutMs - (Date.now() - started) - 1500) return null
  await sleep(waitMs)
  const second = await groqChatOnce({ ...options, timeoutMs: options.timeoutMs - (Date.now() - started) })
  return second === 'rate-limited' ? null : second
}

let lastRetryAfterMs: number | null = null

async function groqChatOnce({
  messages,
  maxTokens,
  temperature,
  timeoutMs,
  label,
  tools,
  toolChoice,
}: GroqOptions): Promise<GroqReply | null | 'rate-limited'> {
  if (!config.groqApiKey) return null
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${config.groqApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.groqModel,
        temperature,
        // gpt-oss is a reasoning model: its hidden "thinking" also uses tokens,
        // so keep effort low and leave room for the visible answer.
        max_tokens: maxTokens,
        reasoning_effort: 'low',
        include_reasoning: false,
        messages,
        ...(tools ? { tools, tool_choice: toolChoice ?? 'auto' } : {}),
      }),
      signal: AbortSignal.timeout(Math.max(1000, timeoutMs)),
    })
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after'))
      lastRetryAfterMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null
      console.warn(`Groq ${label} rate limited (retry after ${seconds || '?'}s)`)
      return 'rate-limited'
    }
    if (!response.ok) {
      // Log the status only; never the key or the request.
      console.warn(`Groq ${label} failed: HTTP ${response.status}`)
      return null
    }
    const message = ((await response.json()) as GroqResponse).choices?.[0]?.message
    const reply = { content: message?.content?.trim() ?? '', toolCalls: message?.tool_calls ?? [] }
    if (!reply.content && reply.toolCalls.length === 0) {
      console.warn(`Groq ${label} failed: empty reply`)
      return null
    }
    return reply
  } catch (error) {
    console.warn(`Groq ${label} failed: ${(error as Error).name}`)
    return null
  }
}

/** Plain text completion (no tools). */
export async function groqComplete(options: Omit<GroqOptions, 'tools' | 'toolChoice'>): Promise<string | null> {
  const reply = await groqChat(options)
  return reply?.content || null
}
