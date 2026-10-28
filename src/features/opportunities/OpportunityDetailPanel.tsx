import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '@/api/endpoints'
import { qk } from '@/api/queryKeys'
import { useUsers } from '@/api/useSession'
import { DetailDrawer, FieldList } from '@/components/DetailDrawer'
import { Badge } from '@/components/ui/Badge'
import { ActivityTimeline, focusActivity } from '@/features/assistant/ActivityTimeline'
import { AssistantPanel } from '@/features/assistant/AssistantPanel'
import { AuditHistory } from '@/features/assistant/AuditHistory'
import { useLocale } from '@/i18n/useLocale'
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/format'
import { isOverdue, weightedValue } from './opportunity'
import { StageBadge } from './StageBadge'

export function OpportunityDetailPanel({ oppId, onClose }: { oppId: string | null; onClose: () => void }) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const users = useUsers()
  const id = oppId ?? ''

  const opp = useQuery({
    queryKey: qk.opportunities.detail(id),
    queryFn: ({ signal }) => api.getOpportunity(id, signal),
    enabled: !!oppId,
  })
  const leadId = opp.data?.leadId ?? ''
  // Evidence for opportunity suggestions comes from the related lead's activity.
  const lead = useQuery({
    queryKey: qk.leads.detail(leadId),
    queryFn: ({ signal }) => api.getLead(leadId, signal),
    enabled: !!leadId,
  })
  const activities = useQuery({
    queryKey: qk.leads.activities(leadId),
    queryFn: ({ signal }) => api.leadActivities(leadId, signal),
    enabled: !!leadId,
  })

  const o = opp.data
  const owner = users.data?.find((u) => u.id === o?.ownerId)

  return (
    <DetailDrawer
      open={!!oppId}
      onClose={onClose}
      title={o?.title[locale]}
      fallbackTitle={t('detail.opportunityTitle')}
      subtitle={o && <StageBadge stage={o.stage} />}
      status={opp.status}
      error={opp.error}
      onRetry={() => void opp.refetch()}
    >
      {o && (
        <>
          <FieldList
            fields={[
              { label: t('detail.relatedLead'), value: lead.data?.company[locale] ?? '…' },
              { label: t('opportunities.columns.amount'), value: <span className="tabular">{formatCurrency(o.amount, locale)}</span> },
              {
                label: t('opportunities.columns.probability'),
                value: <span className="tabular">{formatPercent(o.probability, locale)}</span>,
              },
              {
                label: t('opportunities.columns.weighted'),
                value: <span className="tabular">{formatCurrency(weightedValue(o), locale)}</span>,
              },
              {
                label: t('opportunities.columns.expectedCloseDate'),
                value: (
                  <span className="inline-flex items-center gap-1.5">
                    {formatDate(o.expectedCloseDate, locale)}
                    {isOverdue(o) && <Badge tone="danger">{t('opportunities.overdue')}</Badge>}
                  </span>
                ),
              },
              {
                label: t('opportunities.columns.nextStep'),
                value: o.nextStep?.[locale] ?? <span className="text-fg-muted italic">{t('opportunities.noNextStep')}</span>,
              },
              { label: t('detail.owner'), value: owner?.name[locale] ?? '—' },
              { label: t('detail.version'), value: <span className="tabular">{formatNumber(o.version, locale)}</span> },
            ]}
          />
          <AssistantPanel
            targetType="opportunity"
            targetId={o.id}
            recordLabel={o.title[locale]}
            currentVersion={o.version}
            activities={activities.data ?? []}
            onShowEvidence={focusActivity}
          />
          <ActivityTimeline activities={activities.data ?? []} />
          <AuditHistory targetId={o.id} />
        </>
      )}
    </DetailDrawer>
  )
}
