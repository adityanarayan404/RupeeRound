import {
  ADVISOR_DISCLAIMER,
  FUND_CATEGORY_LABELS,
  formatPaise,
  type AdvisorResponse,
  type AssistantMessage,
  type AssistantResponse,
  type FundDTO,
  type WalletDTO,
} from '@rupeeround/shared'
import { ArrowUp, Bot, RotateCcw } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Card from '@/components/Card'
import RiskSheet from '@/components/RiskSheet'
import ScreenHeader from '@/components/ScreenHeader'
import Skeleton from '@/components/Skeleton'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatLongDate, formatNav, formatPct } from '@/lib/format'
import { useApi } from '@/lib/useApi'

const MAX_LENGTH = 500

const WELCOME =
  'Hi, ask me anything about mutual funds. I use live NAV data from mfapi.in and your RupeeRound balance.'

/** Tapping one sends it straight away. None ask the AI to pick a fund. */
const QUICK_QUESTIONS = [
  'What is NAV?',
  "Large Cap vs Mid Cap: what's the difference?",
  'How has my suggested fund done this year?',
  'What is SIP vs lump sum?',
  'How does compounding work with small amounts?',
  'Why is Small Cap riskier?',
]

/** One chat entry; AI entries remember how they were produced. */
interface Entry extends AssistantMessage {
  source?: AssistantResponse['source']
  usedFunds?: AssistantResponse['usedFunds']
}

// ---------------------------------------------------------------------------
// Safe mini-Markdown: **bold** and "- " bullets only. Builds React elements from
// plain strings (never dangerouslySetInnerHTML), so model text can't inject HTML.
// ---------------------------------------------------------------------------

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      // Drop *single-asterisk italics* markers; we only style bold.
      <Fragment key={index}>{part.replace(/\*([^*\n]+)\*/g, '$1')}</Fragment>
    ),
  )
}

function RichText({ text }: { text: string }) {
  const blocks: { bullet: boolean; lines: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^[-•]\s+/.test(line)
    const content = line.replace(/^[-•]\s+/, '')
    const last = blocks[blocks.length - 1]
    if (bullet && last?.bullet) last.lines.push(content)
    else blocks.push({ bullet, lines: [content] })
  }
  return (
    <div className="space-y-1.5">
      {blocks.map((block, index) =>
        block.bullet ? (
          <ul key={index} className="list-disc space-y-1 pl-4 marker:text-muted">
            {block.lines.map((line, lineIndex) => (
              <li key={lineIndex}>{inline(line)}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{inline(block.lines[0]!)}</p>
        ),
      )}
    </div>
  )
}

function AiAvatar() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-subtle text-accent">
      <Bot className="size-4" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Fund strip + context card
// ---------------------------------------------------------------------------

function FundStrip({ funds, onPick }: { funds: FundDTO[]; onPick: (fund: FundDTO) => void }) {
  const navDate = funds[0]?.navDate
  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {funds.map((fund) => {
          const day = fund.returns.day
          return (
            <button
              key={fund.id}
              type="button"
              onClick={() => onPick(fund)}
              className="w-[136px] shrink-0 rounded-2xl border border-line bg-card p-3 text-left transition-colors hover:border-line-strong"
            >
              <p className="text-[10px] tracking-[0.12em] text-muted uppercase">{FUND_CATEGORY_LABELS[fund.category]}</p>
              <p className="mt-0.5 truncate text-[12px] font-medium">{fund.shortName}</p>
              <p className="mt-1.5 text-[17px] leading-none font-light tracking-tight tabular-nums">{formatNav(fund.nav)}</p>
              {day !== null && (
                <span
                  className={cn(
                    'mt-1.5 inline-block rounded-full px-1.5 py-px font-mono text-[10px] font-semibold',
                    day >= 0 ? 'bg-gain/15 text-gain' : 'bg-loss/15 text-loss',
                  )}
                >
                  {formatPct(day)} today
                </span>
              )}
            </button>
          )
        })}
      </div>
      {navDate && <p className="mt-1.5 text-[11px] text-muted">NAV data from mfapi.in, as of {formatLongDate(navDate)}</p>}
    </div>
  )
}

function ContextCard({ funds }: { funds: FundDTO[] | undefined }) {
  const wallet = useApi<WalletDTO>('/wallet')
  const advisor = useApi<AdvisorResponse>('/advisor')
  const [asking, setAsking] = useState(false)
  const liveNav = funds ? funds.every((fund) => fund.navSource !== 'demo') : null

  const items: { label: string; value: ReactNode }[] = [
    { label: 'Round-up balance', value: wallet.data ? formatPaise(wallet.data.balancePaise) : '…' },
    { label: 'Total invested', value: wallet.data ? formatPaise(wallet.data.totalInvestedPaise) : '…' },
    {
      label: 'Your suggestion',
      value: !advisor.data ? (
        '…'
      ) : advisor.data.needsProfile ? (
        <button type="button" onClick={() => setAsking(true)} className="font-semibold underline underline-offset-2">
          Answer 3 questions to get one
        </button>
      ) : (
        `${FUND_CATEGORY_LABELS[advisor.data.suggestion.category]} · ${advisor.data.suggestion.fund.shortName}`
      ),
    },
    { label: 'Live NAV data', value: liveNav === null ? '…' : liveNav ? 'Loaded' : 'Unavailable' },
  ]

  return (
    <Card className="p-3.5">
      <p className="eyebrow mb-2">What the AI knows</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[10.5px] text-muted">{item.label}</dt>
            <dd className="truncate text-[12.5px] font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
      {asking && <RiskSheet open onClose={() => setAsking(false)} />}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** "Ask RupeeRound AI": mutual-fund Q&A with live NAV data. */
export default function Advisor() {
  const location = useLocation()
  const navigate = useNavigate()
  const funds = useApi<FundDTO[]>('/funds')
  // The conversation lives only in React state: leaving the tab clears it.
  const [entries, setEntries] = useState<Entry[]>([])
  const [input, setInput] = useState('')
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // "Ask AI" buttons elsewhere arrive with a ready-made question to edit or send.
  useEffect(() => {
    const draft = (location.state as { draft?: string } | null)?.draft
    if (draft) {
      setInput(draft.slice(0, MAX_LENGTH))
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location, navigate])

  // Keep the newest message in view.
  useEffect(() => {
    const scroller = scrollRef.current
    if (scroller && entries.length > 0) scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
  }, [entries, waiting, error])

  async function send(text: string, history: Entry[] = entries) {
    const question = text.trim().slice(0, MAX_LENGTH)
    if (!question || waiting) return
    const next: Entry[] = [...history, { role: 'user', content: question }]
    setEntries(next)
    setInput('')
    setError(null)
    setWaiting(true)
    try {
      const response = await api<AssistantResponse>('/assistant/chat', {
        method: 'POST',
        // Only role + content go to the server; the last 20 messages at most.
        body: { messages: next.slice(-20).map(({ role, content }) => ({ role, content })) },
      })
      setEntries([...next, { role: 'assistant', content: response.reply, source: response.source, usedFunds: response.usedFunds }])
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setWaiting(false)
    }
  }

  function retry() {
    const last = entries[entries.length - 1]
    if (last?.role === 'user') void send(last.content, entries.slice(0, -1))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void send(input)
  }

  const lastIsUnavailable = entries[entries.length - 1]?.source === 'unavailable'

  return (
    <div className="flex h-full flex-col">
      {/* Only this part scrolls; the input below stays put. */}
      <div ref={scrollRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <ScreenHeader
          title="AI Advisor"
          subtitle="Mutual fund questions only"
          right={
            <button
              type="button"
              onClick={() => {
                setEntries([])
                setError(null)
                setInput('')
              }}
              aria-label="Clear chat"
              className="grid size-9 place-items-center rounded-full border border-line bg-card text-muted hover:text-ink"
            >
              <RotateCcw className="size-4" />
            </button>
          }
        />

        <div className="space-y-3 px-4 pb-4">
          {funds.loading ? (
            <div className="flex gap-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-[104px] w-[136px] shrink-0 rounded-2xl" />
              ))}
            </div>
          ) : funds.data ? (
            <FundStrip
              funds={funds.data}
              onPick={(fund) => {
                setInput(`Tell me about ${fund.shortName}`)
                inputRef.current?.focus()
              }}
            />
          ) : null}

          <ContextCard funds={funds.data} />

          {/* Welcome + quick questions */}
          <div className="flex gap-2.5 pt-1">
            <AiAvatar />
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl rounded-tl-md border border-line bg-card px-3.5 py-2.5 text-[13.5px] leading-relaxed">
                {WELCOME}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    disabled={waiting}
                    onClick={() => void send(question)}
                    className="rounded-full border border-line bg-card px-2.5 py-1 text-left text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div className="space-y-3" aria-live="polite">
            {entries.map((entry, index) => {
              if (entry.role === 'user') {
                return (
                  <div key={index} className="animate-rise flex justify-end">
                    <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-on-primary">
                      {entry.content}
                    </div>
                  </div>
                )
              }
              // Our disclaimer is the last line of on-topic answers; show it smaller.
              const hasDisclaimer = entry.content.endsWith(ADVISOR_DISCLAIMER)
              const body = hasDisclaimer ? entry.content.slice(0, -ADVISOR_DISCLAIMER.length).trim() : entry.content
              return (
                <div key={index} className="animate-rise flex gap-2.5">
                  <AiAvatar />
                  <div className="min-w-0 max-w-[85%]">
                    <div
                      className={cn(
                        'rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[13.5px] leading-relaxed',
                        entry.source === 'ai' ? 'border-line bg-card' : 'border-dashed border-line-strong/70 text-muted',
                      )}
                    >
                      <RichText text={body} />
                      {hasDisclaimer && <p className="mt-2 text-[10.5px] text-muted">{ADVISOR_DISCLAIMER}</p>}
                    </div>
                    {entry.usedFunds && entry.usedFunds.length > 0 && (
                      <p className="mt-1 pl-1 text-[10.5px] text-muted">
                        Data from mfapi.in · {entry.usedFunds.map((fund) => fund.name).join(', ')}
                      </p>
                    )}
                    {entry.source === 'unavailable' && index === entries.length - 1 && (
                      <button type="button" onClick={() => {
                        const question = entries[index - 1]
                        if (question?.role === 'user') void send(question.content, entries.slice(0, index - 1))
                      }} className="mt-1 pl-1 text-[12px] font-semibold underline">
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {waiting && (
              <div className="flex gap-2.5" aria-label="AI is answering">
                <AiAvatar />
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-line bg-card px-3.5 py-3">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="size-1.5 rounded-full bg-muted motion-safe:animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {error && !lastIsUnavailable && (
              <div className="rounded-2xl border border-loss/30 bg-loss/10 px-3.5 py-2.5 text-[13px] text-loss">
                {error}{' '}
                <button type="button" onClick={retry} className="font-semibold underline">
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input pinned above the tab bar (and the raised Scan button). */}
      <div className="shrink-0 border-t border-line bg-bg/85 px-4 pt-2.5 pb-[calc(var(--tabbar-h)+34px)] backdrop-blur-xl">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, MAX_LENGTH))}
            disabled={waiting}
            maxLength={MAX_LENGTH}
            placeholder="Ask about mutual funds..."
            aria-label="Your question"
            className="h-11 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-[13.5px] outline-none placeholder:text-muted/60 focus:border-line-strong disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || waiting}
            aria-label="Send question"
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-full transition-colors',
              input.trim() && !waiting ? 'bg-primary text-on-primary' : 'bg-subtle text-muted',
            )}
          >
            <ArrowUp className="size-5" strokeWidth={2.4} />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted">
          Educational only, not financial advice. Payments and investments are simulated.
        </p>
      </div>
    </div>
  )
}
