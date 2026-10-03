import type { ReactNode } from 'react'
import ScreenHeader from '@/components/ScreenHeader'
import Screen from '@/components/Screen'

/** Shared layout for the login and sign-up steps. */
export default function AuthScreen({
  back,
  title,
  description,
  children,
  footer,
}: {
  back?: string
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Screen className="flex flex-col">
      <ScreenHeader title="" back={back} />
      <div className="animate-rise flex flex-1 flex-col px-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-base text-muted">{description}</p>}
        <div className="mt-8 flex flex-1 flex-col">{children}</div>
      </div>
      {footer && <div className="pb-safe px-6 pt-4">{footer}</div>}
    </Screen>
  )
}
