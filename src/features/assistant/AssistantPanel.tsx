import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { Activity, AiSuggestion } from '@/api/schemas'
import { SparkleIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/States'
import { useSuggestions } from './hooks'
import { SuggestionCard } from './SuggestionCard'

interface AssistantPanelProps {
  targetType: AiSuggestion['targetType']
  targetId: string
  recordLabel: string
  currentVersion: number | undefined
  activities: Activity[]
  onShowEvidence: (activityId: string) => void
}

export function AssistantPanel({ targetType, targetId, ...cardProps }: AssistantPanelProps) {
  const { t } = useTranslation()
  const headingId = useId()
  const suggestions = useSuggestions(targetType, targetId)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3" data-testid="assistant-panel">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="flex items-center gap-1.5 text-base font-semibold text-ai">
          <SparkleIcon />
          {t('assistant.title')}
        </h2>
        <p className="text-xs text-fg-muted">{t('assistant.disclaimer')}</p>
      </div>

      {suggestions.isPending ? (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <span className="sr-only">{t('assistant.loading')}</span>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ) : suggestions.isError ? (
        <div className="rounded-lg border border-border">
          <ErrorState error={suggestions.error} onRetry={() => void suggestions.refetch()} />
        </div>
      ) : suggestions.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-fg-muted">{t('assistant.none')}</p>
      ) : (
        suggestions.data.map((s) => <SuggestionCard key={s.id} suggestion={s} {...cardProps} />)
      )}
    </section>
  )
}
