/** Show/hide for a long meeting section (research, debate). The content stays in the DOM, `hidden` when folded. */
export function FoldToggle({ open, onToggle, controls, label }: { open: boolean; onToggle: () => void; controls: string; label: string }) {
  return (
    <button type="button" className="fold" aria-expanded={open} aria-controls={controls} onClick={onToggle}>
      {open ? 'Hide' : 'Show'}
      <span className="visually-hidden"> {label}</span>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
