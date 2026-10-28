import { useId, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/Toast'
import { getChaos, setChaos, subscribeChaos, type ForcedFailure, type LatencyMode } from '@/mocks/chaos'

const FAILURES = ['', '401', '403', '429', '500'] as const

/**
 * Reviewer tooling, not product UI: drives the mock backend's fault injection so
 * loading, retry, rollback, 401/403 and 409 paths can be shown live in the review.
 * Lives in a collapsed <details> in the footer so it never competes with the app.
 */
export function DemoControls() {
  const { t } = useTranslation()
  const chaos = useSyncExternalStore(subscribeChaos, getChaos)
  const ids = { latency: useId(), flaky: useId(), failAll: useId(), failWrites: useId() }

  const failureSelect = (key: 'forceFailure' | 'forceWriteFailure', id: string, label: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <Select
        id={id}
        size="sm"
        value={chaos[key] ?? ''}
        onChange={(e) => setChaos({ [key]: (e.target.value ? Number(e.target.value) : null) as ForcedFailure })}
      >
        {FAILURES.map((f) => (
          <option key={f} value={f}>
            {f || t('demo.none')}
          </option>
        ))}
      </Select>
    </div>
  )

  return (
    <details className="rounded-lg border border-dashed border-border bg-surface p-3 text-sm" data-testid="demo-controls">
      <summary className="font-medium">{t('demo.title')}</summary>
      <p className="mt-2 text-xs text-fg-muted">{t('demo.hint')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.latency} className="text-xs font-medium">
            {t('demo.latency')}
          </label>
          <Select
            id={ids.latency}
            size="sm"
            value={chaos.latency}
            onChange={(e) => setChaos({ latency: e.target.value as LatencyMode })}
          >
            <option value="none">{t('demo.latencyNone')}</option>
            <option value="normal">{t('demo.latencyNormal')}</option>
            <option value="slow">{t('demo.latencySlow')}</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.flaky} className="text-xs font-medium">
            {t('demo.flaky')}
          </label>
          <Select
            id={ids.flaky}
            size="sm"
            value={String(chaos.flakyRate)}
            onChange={(e) => setChaos({ flakyRate: Number(e.target.value) })}
          >
            <option value="0">{t('demo.flakyOff')}</option>
            <option value="0.3">30%</option>
            <option value="0.7">70%</option>
            <option value="1">100%</option>
          </Select>
        </div>
        {failureSelect('forceFailure', ids.failAll, t('demo.failAll'))}
        {failureSelect('forceWriteFailure', ids.failWrites, t('demo.failWrites'))}
      </div>
    </details>
  )
}

/**
 * Rendered inside the record drawer (the page behind a modal drawer is inert, so the
 * footer panel can't be used while a record is open). Bumps the record's version on the
 * "server" without updating this client's cache, so the next save or AI apply gets a 409.
 */
export function ExternalEditButton({ type, id }: { type: 'lead' | 'opportunity'; id: string }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-md border border-dashed border-border p-2">
      <p className="mb-1.5 text-xs text-fg-muted">{t('demo.title')}</p>
      <Button
        size="sm"
        data-testid="demo-external-edit"
        onClick={async () => {
          const res = await fetch(`/api/__demo/external-edit/${type}/${id}`, { method: 'POST' })
          toast(res.ok ? t('demo.externalEditDone') : t('common.error'), res.ok ? 'info' : 'danger')
        }}
      >
        {t('demo.externalEdit')}
      </Button>
    </div>
  )
}
