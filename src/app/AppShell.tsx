import type { MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/api/useSession'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLocale } from '@/i18n/useLocale'
import { cn } from '@/lib/cn'
import { navigate, ROUTES, useLocation } from './router'

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const { pathname } = useLocation()
  const active = pathname === to
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a
      href={to}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-md px-3 py-2 text-sm font-medium',
        active ? 'bg-surface-muted text-fg' : 'text-fg-muted hover:text-fg',
      )}
    >
      {children}
    </a>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const me = useCurrentUser()

  return (
    <div className="min-h-dvh">
      {/* First focusable element: lets keyboard users jump past the header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:inset-s-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-card"
      >
        {t('app.skipToContent')}
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 md:px-6">
          <p className="text-base font-semibold">{t('app.name')}</p>
          <nav aria-label={t('app.mainNav')} className="order-last flex gap-1 md:order-0">
            <NavLink to={ROUTES.leads}>{t('nav.leads')}</NavLink>
            <NavLink to={ROUTES.opportunities}>{t('nav.opportunities')}</NavLink>
          </nav>
          <div className="ms-auto flex items-center gap-3">
            {me.data && (
              <span className="hidden text-sm text-fg-muted sm:inline">{me.data.name[locale]}</span>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 focus:outline-none md:px-6">
        {children}
      </main>
    </div>
  )
}
