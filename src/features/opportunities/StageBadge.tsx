import { useTranslation } from 'react-i18next'
import type { OpportunityStage } from '@/api/schemas'
import { Badge, type BadgeTone } from '@/components/ui/Badge'

const TONE: Record<OpportunityStage, BadgeTone> = {
  discovery: 'info',
  proposal: 'warning',
  negotiation: 'ai',
  closed_won: 'success',
  closed_lost: 'neutral',
}

export function StageBadge({ stage }: { stage: OpportunityStage }) {
  const { t } = useTranslation()
  return <Badge tone={TONE[stage]}>{t(`stage.${stage}`)}</Badge>
}
