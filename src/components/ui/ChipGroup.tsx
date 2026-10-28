import { cn } from '@/lib/cn'

interface ChipGroupProps<V extends string> {
  legend: string
  options: readonly V[]
  selected: readonly V[]
  label: (value: V) => string
  onChange: (next: V[]) => void
}

/**
 * Multi-select filter rendered as chips. Built from real checkboxes inside a
 * <fieldset>, so Tab/Space, checked state and the group name come for free.
 */
export function ChipGroup<V extends string>({ legend, options, selected, label, onChange }: ChipGroupProps<V>) {
  const toggle = (v: V) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((v) => {
          const checked = selected.includes(v)
          return (
            <label
              key={v}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                checked ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface hover:bg-surface-muted',
              )}
            >
              <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(v)} />
              {label(v)}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
