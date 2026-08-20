import { Link } from 'react-router-dom'
import { APP_NAME, APP_VERSION } from '@/domain/types'

export function AboutPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-heading text-3xl font-semibold tracking-tight">{APP_NAME}</p>
      <p className="mt-2 text-sm text-muted-foreground">Version {APP_VERSION}</p>
      <Link to="/me" className="mt-8 text-sm text-complete">
        返回
      </Link>
    </div>
  )
}
