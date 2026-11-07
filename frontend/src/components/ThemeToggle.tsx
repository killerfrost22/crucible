import { setTheme, useTheme } from '../lib/theme'

/** Switches between light and dark. Shows the theme you would switch to. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} mode`
  return (
    <button type="button" className={className ? `theme-toggle ${className}` : 'theme-toggle'} onClick={() => setTheme(next)} aria-label={label} title={label}>
      {next === 'light' ? (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M16.4 12.6A6.8 6.8 0 0 1 7.4 3.6a6.8 6.8 0 1 0 9 9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
