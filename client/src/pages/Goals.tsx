import { formatPaise, parseRupeesInput, type GoalDTO, type GoalsResponse } from '@rupeeround/shared'
import { CalendarDays, Plus, Target, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import Button from '@/components/Button'
import Card from '@/components/Card'
import ProgressRing from '@/components/ProgressRing'
import ScreenHeader from '@/components/ScreenHeader'
import Sheet from '@/components/Sheet'
import Skeleton from '@/components/Skeleton'
import StateMessage, { ErrorMessage } from '@/components/StateMessage'
import TextField from '@/components/TextField'
import { useToast } from '@/context/ToastContext'
import { api, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { daysUntil, formatLongDate, sanitizeAmountInput } from '@/lib/format'
import { invalidate, useApi } from '@/lib/useApi'

const EMOJIS = ['🎯', '🎧', '💻', '📱', '🏖️', '🎓', '🚲', '🎁', '🛟', '🌱']

function GoalCard({ goal, onDelete }: { goal: GoalDTO; onDelete: () => void }) {
  const progress = goal.savedPaise / goal.targetPaise
  const complete = progress >= 1
  const days = goal.deadline ? daysUntil(goal.deadline) : null

  return (
    <Card className="flex items-center gap-4">
      <ProgressRing value={progress} size={72} stroke={7} complete={complete}>
        <span className="text-2xl">{goal.emoji}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{goal.title}</p>
        <p className="text-sm tabular-nums">
          <span className="font-bold">{formatPaise(Math.min(goal.savedPaise, goal.targetPaise))}</span>
          <span className="text-muted"> / {formatPaise(goal.targetPaise)}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {complete ? (
            <span className="rounded-full bg-gain/15 px-2 py-0.5 font-bold text-gain">Reached 🎉</span>
          ) : (
            <span className="whitespace-nowrap">{Math.round(progress * 1000) / 10}% complete</span>
          )}
          {goal.deadline && days !== null && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              <CalendarDays className="size-3" />
              {days >= 0 ? `${days} days left` : `ended ${formatLongDate(goal.deadline)}`}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${goal.title}`}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-loss/10 hover:text-loss"
      >
        <Trash2 className="size-4" />
      </button>
    </Card>
  )
}

function NewGoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [emoji, setEmoji] = useState(EMOJIS[0]!)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [busy, setBusy] = useState(false)
  const targetPaise = parseRupeesInput(target)
  const valid = Boolean(title.trim() && targetPaise)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    setBusy(true)
    try {
      await api<GoalDTO>('/goals', {
        method: 'POST',
        body: { title: title.trim(), emoji, targetPaise, deadline: deadline || null },
      })
      invalidate('/goals')
      toast({ title: 'Goal added', tone: 'success' })
      setTitle('')
      setTarget('')
      setDeadline('')
      onClose()
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="New goal">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-muted">Pick an icon</p>
          <div className="grid grid-cols-5 gap-2">
            {EMOJIS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={emoji === option}
                onClick={() => setEmoji(option)}
                className={cn(
                  'grid h-12 place-items-center rounded-2xl border text-2xl transition-all',
                  emoji === option ? 'border-primary bg-tan/50 ring-2 ring-primary/20' : 'border-line bg-card',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <TextField label="Goal" value={title} onChange={(event) => setTitle(event.target.value.slice(0, 40))} placeholder="e.g. New laptop" />
        <TextField
          label="Target amount"
          prefix="₹"
          value={target}
          onChange={(event) => setTarget(sanitizeAmountInput(event.target.value))}
          inputMode="decimal"
          placeholder="5,000"
        />
        <TextField
          label="Target date (optional)"
          type="date"
          value={deadline}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(event) => setDeadline(event.target.value)}
        />
        <Button type="submit" size="lg" fullWidth loading={busy} disabled={!valid}>
          Add goal
        </Button>
      </form>
    </Sheet>
  )
}

export default function Goals() {
  const toast = useToast()
  const goals = useApi<GoalsResponse>('/goals')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<GoalDTO | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function deleteGoal() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await api(`/goals/${confirmDelete.id}`, { method: 'DELETE' })
      invalidate('/goals')
      setConfirmDelete(null)
    } catch (caught) {
      toast({ title: errorMessage(caught), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <ScreenHeader
        title="Goals"
        subtitle="What your round-ups are for"
        right={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New
          </Button>
        }
      />
      <div className="space-y-4 px-5">
        {goals.loading ? (
          <>
            <Skeleton className="h-24 rounded-3xl" />
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[104px] rounded-3xl" />
            ))}
          </>
        ) : goals.error || !goals.data ? (
          <ErrorMessage message={goals.error?.message ?? 'No goals data'} onRetry={goals.reload} />
        ) : (
          <>
            <div className="rounded-3xl bg-linear-to-br from-(--wallet-from) to-(--wallet-to) p-5 text-[#FBF8F1]">
              <p className="text-sm font-semibold text-[#FBF8F1]/85">Total saved</p>
              <p className="text-3xl font-extrabold tracking-tight tabular-nums">{formatPaise(goals.data.savedPaise)}</p>
              <p className="text-sm text-[#FBF8F1]/80">Wallet + invested. Every goal tracks this total.</p>
            </div>

            {goals.data.goals.length === 0 ? (
              <StateMessage
                icon={Target}
                title="No goals yet"
                description="Give your round-ups a purpose: a trip, a laptop or an emergency fund."
                action={<Button onClick={() => setCreating(true)}>Add your first goal</Button>}
              />
            ) : (
              goals.data.goals.map((goal) => <GoalCard key={goal.id} goal={goal} onDelete={() => setConfirmDelete(goal)} />)
            )}
          </>
        )}
      </div>

      <NewGoalSheet open={creating} onClose={() => setCreating(false)} />

      <Sheet open={confirmDelete !== null} onClose={() => !deleting && setConfirmDelete(null)} title="Delete goal?">
        <p className="-mt-2 text-sm text-muted">
          "{confirmDelete?.title}" will be removed. Your savings stay exactly where they are.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={() => setConfirmDelete(null)} disabled={deleting}>
            Keep it
          </Button>
          <Button variant="danger" size="lg" loading={deleting} onClick={deleteGoal}>
            Delete
          </Button>
        </div>
      </Sheet>
    </>
  )
}
