import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { useUsers } from '@/api/useSession'
import { ExternalEditButton } from '@/app/DemoControls'
import { DetailDrawer, FieldList } from '@/components/DetailDrawer'
import { ActivityTimeline } from '@/features/assistant/ActivityTimeline'
import { focusActivity } from '@/features/assistant/focusActivity'
import { AssistantPanel } from '@/features/assistant/AssistantPanel'
import { AuditHistory } from '@/features/assistant/AuditHistory'
import { useLocale } from '@/i18n/useLocale'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadStatusControl } from './LeadStatusControl'

export function LeadDetailPanel({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const users = useUsers()
  const id = leadId ?? ''

  const lead = useQuery({
    queryKey: qk.leads.detail(id),
    queryFn: ({ signal }) => api.getLead(id, signal),
    enabled: !!leadId,
  })
  const activities = useQuery({
    queryKey: qk.leads.activities(id),
    queryFn: ({ signal }) => api.leadActivities(id, signal),
    enabled: !!leadId,
  })

  const l = lead.data
  const owner = users.data?.find((u) => u.id === l?.ownerId)

  return (
    <DetailDrawer
      open={!!leadId}
      onClose={onClose}
      title={l?.company[locale]}
      fallbackTitle={t('detail.leadTitle')}
      subtitle={l && <LeadStatusBadge status={l.status} />}
      status={lead.status}
      error={lead.error}
      onRetry={() => void lead.refetch()}
    >
      {l && (
        <>
          <FieldList
            fields={[
              { label: t('detail.contact'), value: l.contactName[locale] },
              { label: t('detail.email'), value: <span dir="ltr">{l.email}</span> },
              // Phone numbers stay LTR inside Arabic text so digits/groups don't reorder.
              { label: t('detail.phone'), value: <span dir="ltr">{l.phone}</span> },
              { label: t('leads.columns.city'), value: t(`city.${l.city}`) },
              { label: t('detail.industry'), value: t(`industry.${l.industry}`) },
              { label: t('detail.source'), value: t(`source.${l.source}`) },
              {
                label: t('leads.columns.score'),
                value: <span className="tabular">{formatNumber(l.score, locale)}</span>,
              },
              {
                label: t('leads.columns.estimatedValue'),
                value: <span className="tabular">{formatCurrency(l.estimatedValue, locale)}</span>,
              },
              { label: t('leads.columns.createdAt'), value: formatDate(l.createdAt, locale) },
              { label: t('detail.owner'), value: owner?.name[locale] ?? '—' },
              { label: t('detail.version'), value: <span className="tabular">{formatNumber(l.version, locale)}</span> },
            ]}
          />
          <LeadStatusControl lead={l} />
          <AssistantPanel
            targetType="lead"
            targetId={l.id}
            recordLabel={l.company[locale]}
            currentVersion={l.version}
            activities={activities.data ?? []}
            onShowEvidence={focusActivity}
          />
          <ActivityTimeline activities={activities.data ?? []} />
          <AuditHistory targetId={l.id} />
          <ExternalEditButton type="lead" id={l.id} />
        </>
      )}
    </DetailDrawer>
  )
}
