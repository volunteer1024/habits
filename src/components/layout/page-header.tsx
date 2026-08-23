import type { ReactNode } from 'react'

export function PageHeader({
  title,
  titleAddon,
  description,
  action,
}: {
  title: string
  titleAddon?: ReactNode
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
          {titleAddon}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  )
}
