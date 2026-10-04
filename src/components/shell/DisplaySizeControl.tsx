import { DISPLAY_CHOICES, useDisplayScale } from '../../lib/displayScale'

/* One question: how big should this page be? A presenter at a projector answers
   it once and the browser remembers. Both forms use words, never symbols, and
   the current choice is marked as well as coloured. The select is for the
   sidebar and the phone menu, where room is short; the segmented row is for
   present mode, where a presenter wants all four in view. */
export function DisplaySizeControl({ variant = 'select', dark = false }: { variant?: 'select' | 'segmented'; dark?: boolean }) {
  const { choice, setChoice, scale } = useDisplayScale()
  const percent = scale === 1 ? '' : ` · ${Math.round(scale * 100)}%`

  if (variant === 'segmented') {
    return (
      <div role="radiogroup" aria-label="Display size" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {DISPLAY_CHOICES.map((option) => {
          const selected = option.key === choice
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.hint}
              onClick={() => setChoice(option.key)}
              style={{
                minHeight: 44,
                padding: '0 16px',
                borderRadius: 'var(--mbc-radius-pill)',
                cursor: 'pointer',
                font: `${selected ? 700 : 400} 14px/1.2 var(--mbc-font-sans)`,
                color: dark ? 'var(--text-on-dark)' : 'var(--text-heading)',
                background: selected ? (dark ? 'var(--action-dark-press)' : 'var(--surface-panel)') : 'transparent',
                border: `1px solid ${selected ? (dark ? 'var(--text-on-dark)' : 'var(--text-heading)') : dark ? 'var(--mbc-dark-border)' : 'var(--border-control)'}`,
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ font: '700 9px/1 var(--mbc-font-sans)', letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Display size{percent}
      </span>
      <select
        data-reads=""
        value={choice}
        onChange={(event) => setChoice(event.target.value as typeof choice)}
        style={{
          minHeight: 44,
          width: '100%',
          background: 'var(--surface-field)',
          border: '1px solid var(--mbc-border-input)',
          borderRadius: 10,
          padding: '0 12px',
          font: '400 14px/1.3 var(--mbc-font-sans)',
          color: 'var(--text-heading)',
        }}
      >
        {DISPLAY_CHOICES.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label} · {option.hint}
          </option>
        ))}
      </select>
    </label>
  )
}
