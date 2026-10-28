import { useId } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { session } from '@/api/session'
import { useSession, useUsers } from '@/api/useSession'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useLocale } from '@/i18n/useLocale'

/**
 * Simulated sign-in: lets a reviewer switch between rep / manager / read-only
 * viewer to see authorization (403) handling and role-aware UI live.
 */
export function RoleSwitcher() {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const id = useId()
  const { userId } = useSession()
  const users = useUsers()
  const client = useQueryClient()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only sm:not-sr-only sm:text-sm sm:text-fg-muted">
        {t('roles.label')}
      </label>
      <Select
        id={id}
        size="sm"
        value={userId ?? ''}
        onChange={(e) => {
          session.signIn(e.target.value)
          // Permissions changed: drop cached data fetched under the previous identity.
          void client.invalidateQueries()
        }}
        className="min-w-0"
      >
        {users.data?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name[locale]} · {t(`roles.${u.role}`)}
          </option>
        ))}
      </Select>
    </div>
  )
}

/** Shown after any 401. Re-authenticating clears the flag and refetches everything. */
export function SessionExpiredBanner() {
  const { t } = useTranslation()
  const { expired, userId } = useSession()
  const client = useQueryClient()
  if (!expired) return null
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 bg-danger-bg px-4 py-2 text-sm text-danger">
      <span>{t('session.expired')}</span>
      <Button
        size="sm"
        onClick={() => {
          session.signIn(userId ?? 'u-rep')
          void client.invalidateQueries()
        }}
      >
        {t('session.signIn')}
      </Button>
    </div>
  )
}
