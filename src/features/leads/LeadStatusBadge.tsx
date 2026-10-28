import { useTranslation } from 'react-i18next'
import type { LeadStatus } from '@/api/schemas'
import { Badge, type BadgeTone } from '@/components/ui/Badge'

const TONE: Record<LeadStatus, BadgeTone> = {
  new: 'info',
  contacted: 'warning',
  qualified: 'success',
  unqualified: 'neutral',
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { t } = useTranslation()
  return <Badge tone={TONE[status]}>{t(`leadStatus.${status}`)}</Badge>
}
