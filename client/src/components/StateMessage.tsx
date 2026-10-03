import { CircleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import Button from './Button'

interface StateMessageProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
}

/** Empty states and error states share this centred layout. */
export default function StateMessage({ icon: Icon = CircleAlert, title, description, action }: StateMessageProps) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-subtle text-accent">
        <Icon className="size-7" />
      </span>
      <p className="font-bold">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateMessage
      title="Couldn't load this"
      description={message}
      action={
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  )
}
