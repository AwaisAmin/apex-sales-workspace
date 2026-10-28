import { useTranslation } from 'react-i18next'
import { THEMES, useTheme, type ThemePreference } from '@/app/theme'
import { cn } from '@/lib/cn'

const ICONS: Record<ThemePreference, string> = {
  // monitor
  system: 'M3 4.5h14v9H3zM7.5 16.5h5M10 13.5v3',
  // sun
  light:
    'M10 6.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM10 2v1.8M10 16.2V18M2 10h1.8M16.2 10H18M4.3 4.3l1.3 1.3M14.4 14.4l1.3 1.3M4.3 15.7l1.3-1.3M14.4 5.6l1.3-1.3',
  // moon
  dark: 'M16 12.5A6.5 6.5 0 0 1 7.5 4a6.5 6.5 0 1 0 8.5 8.5z',
}

/**
 * Segmented control built from a native radio group: arrow keys move between options,
 * the group has a name, and each option an accessible label even though only icons show.
 */
export function ThemeSwitcher() {
  const { t } = useTranslation()
  const [theme, setTheme] = useTheme()

  return (
    <fieldset className="flex items-center rounded-md border border-border-strong p-0.5" data-testid="theme-switcher">
      <legend className="sr-only">{t('theme.label')}</legend>
      {THEMES.map((value) => (
        <label
          key={value}
          title={t(`theme.${value}`)}
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-sm text-fg-muted',
            'has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-focus',
            theme === value ? 'bg-surface-muted text-fg' : 'hover:text-fg',
          )}
        >
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={() => setTheme(value)}
            className="sr-only"
          />
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4">
            <path
              d={ICONS[value]}
              fill={value === 'dark' ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="sr-only">{t(`theme.${value}`)}</span>
        </label>
      ))}
    </fieldset>
  )
}
