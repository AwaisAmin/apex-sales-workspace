import { useTranslation } from 'react-i18next'
import type { ProposedChange } from '@/api/schemas'
import { useLocale } from '@/i18n/useLocale'
import { LeadStatusBadge } from '@/features/leads/LeadStatusBadge'
import { StageBadge } from '@/features/opportunities/StageBadge'

/** Renders one side (before/after) of a proposed change in the field's normal visual form. */
export function ChangeValue({ change, side }: { change: ProposedChange; side: 'from' | 'to' }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  switch (change.field) {
    case 'leadStatus':
      return <LeadStatusBadge status={change[side]} />
    case 'opportunityStage':
      return <StageBadge stage={change[side]} />
    case 'nextStep': {
      const value = change[side]
      return value ? <span>{value[locale]}</span> : <span className="text-fg-muted italic">{t('assistant.empty')}</span>
    }
  }
}

/** Before/after as labelled rows (not an arrow), so it reads the same in LTR and RTL. */
export function ChangeDiff({ change }: { change: ProposedChange }) {
  const { t } = useTranslation()
  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm">
      <dt className="text-fg-muted">{t('approval.before')}</dt>
      <dd>
        <ChangeValue change={change} side="from" />
      </dd>
      <dt className="text-fg-muted">{t('approval.after')}</dt>
      <dd className="font-medium">
        <ChangeValue change={change} side="to" />
      </dd>
    </dl>
  )
}
