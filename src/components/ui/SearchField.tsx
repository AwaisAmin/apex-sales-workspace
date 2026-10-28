import { useEffect, useId, useRef, useState } from 'react'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

interface SearchFieldProps {
  label: string
  placeholder?: string
  value: string | undefined
  /** Called with the debounced value (undefined when cleared). */
  onSearch: (value: string | undefined) => void
  delayMs?: number
}

/** Local input state, debounced into the caller (URL) — avoids a request per keystroke. */
export function SearchField({ label, placeholder, value, onSearch, delayMs = 300 }: SearchFieldProps) {
  const id = useId()
  const [text, setText] = useState(value ?? '')
  const debounced = useDebouncedValue(text, delayMs)
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  useEffect(() => {
    if (debounced !== (value ?? '')) onSearchRef.current(debounced || undefined)
    // Only react to the debounced text; `value` changes are handled by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  // Keep the input in sync when the value changes externally (Back button, "Clear filters").
  useEffect(() => setText(value ?? ''), [value])

  return (
    <div className="flex flex-col gap-1 md:w-72">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-md border border-border-strong bg-surface px-3 placeholder:text-fg-muted"
      />
    </div>
  )
}
