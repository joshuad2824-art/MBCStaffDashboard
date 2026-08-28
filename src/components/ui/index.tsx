import { useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode } from 'react'

/* The MBC primitives, ported from the bound design system. Rules that are easy
   to break by accident and are enforced here: pill buttons, 44px minimum control
   height, no shadow on screen, and hover that darkens rather than lifts. */

type Variant = 'primary' | 'outline' | 'dark' | 'light' | 'ghostDark'
type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, CSSProperties> = {
  sm: { padding: '12px 22px', font: '700 12px/1 var(--mbc-font-sans)', letterSpacing: '.06em' },
  md: { padding: '15px 28px', font: '700 13px/1 var(--mbc-font-sans)', letterSpacing: '.04em' },
  lg: { padding: '16px 30px', font: '700 14px/1 var(--mbc-font-sans)', letterSpacing: '.03em' },
}

const VARIANTS: Record<Variant, { base: CSSProperties; hover: CSSProperties }> = {
  primary: {
    base: { background: 'var(--action-primary)', border: 'none', color: 'var(--action-primary-text)' },
    hover: { filter: 'brightness(.92)' },
  },
  outline: {
    base: { background: 'none', border: '1px solid var(--border-control)', color: 'var(--text-heading)' },
    hover: { borderColor: 'var(--border-control-hover)', background: 'var(--action-ghost-hover)' },
  },
  dark: {
    base: { background: 'var(--action-dark)', border: 'none', color: 'var(--text-on-dark)' },
    hover: { background: 'var(--action-dark-press)' },
  },
  light: {
    base: { background: 'var(--action-light)', border: 'none', color: 'var(--text-heading)' },
    hover: { background: 'var(--mbc-parchment)' },
  },
  ghostDark: {
    base: { background: 'none', border: '1px solid var(--mbc-dark-border)', color: 'var(--text-on-dark)' },
    hover: { borderColor: 'var(--text-on-dark)' },
  },
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
  /** Form buttons take the 10px input radius so they line up with the fields. */
  shape?: 'pill' | 'input'
}

export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  shape = 'pill',
  disabled = false,
  style,
  children,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false)
  const tone = VARIANTS[variant]
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: shape === 'input' ? 'var(--mbc-radius-input)' : 'var(--mbc-radius-pill)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        width: full ? '100%' : undefined,
        minHeight: 'var(--mbc-tap-min)',
        transition: 'var(--motion-hover)',
        opacity: disabled ? 0.42 : 1,
        ...SIZES[size],
        ...tone.base,
        ...(hover && !disabled ? tone.hover : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

type CardTone = 'paper' | 'panel' | 'dark' | 'print'
type CardRadius = 'card' | 'cardLg' | 'panel' | 'panelLg'

const CARD_TONES: Record<CardTone, CSSProperties> = {
  paper: { background: 'var(--surface-card)', border: '1px solid var(--border-card)', color: 'var(--text-heading)' },
  panel: { background: 'var(--surface-panel)', border: '1px solid var(--border-section)', color: 'var(--text-heading)' },
  dark: { background: 'var(--surface-dark)', border: 'none', color: 'var(--text-on-dark)' },
  print: {
    background: 'var(--surface-print)',
    border: '1px solid var(--mbc-border-photo)',
    color: 'var(--text-heading)',
    boxShadow: 'var(--mbc-shadow-print)',
  },
}

const CARD_RADII: Record<CardRadius, string> = {
  card: 'var(--mbc-radius-card)',
  cardLg: 'var(--mbc-radius-card-lg)',
  panel: 'var(--mbc-radius-panel)',
  panelLg: 'var(--mbc-radius-panel-lg)',
}

export function Card({
  tone = 'paper',
  radius = 'panel',
  pad = 30,
  style,
  children,
}: {
  tone?: CardTone
  radius?: CardRadius
  pad?: number | string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div style={{ borderRadius: CARD_RADII[radius], padding: pad, ...CARD_TONES[tone], ...style }}>{children}</div>
  )
}

export function Chip({
  active = false,
  onClick,
  style,
  children,
}: {
  active?: boolean
  onClick?: () => void
  style?: CSSProperties
  children: ReactNode
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 'var(--mbc-radius-pill)',
        padding: '11px 20px',
        cursor: 'pointer',
        font: '700 12px/1 var(--mbc-font-sans)',
        letterSpacing: '.05em',
        transition: 'var(--motion-hover)',
        background: active ? 'var(--action-dark)' : 'transparent',
        color: active ? 'var(--text-on-dark)' : 'var(--text-body)',
        border: '1px solid ' + (active ? 'var(--action-dark)' : 'var(--mbc-border-chip)'),
        ...(hover && !active ? { borderColor: 'var(--border-control-hover)' } : null),
        ...style,
      }}
    >
      {children}
    </button>
  )
}

type EyebrowTone = 'lamplight' | 'sage' | 'stone' | 'onDark' | 'brass'

const EYEBROW_TONES: Record<EyebrowTone, string> = {
  lamplight: 'var(--text-eyebrow)',
  sage: 'var(--text-category)',
  stone: 'var(--text-muted)',
  onDark: 'var(--text-on-dark-label)',
  brass: 'var(--text-on-dark-accent)',
}

export function Eyebrow({
  tone = 'lamplight',
  size = 'md',
  style,
  children,
}: {
  tone?: EyebrowTone
  size?: 'sm' | 'md'
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <p
      style={{
        font: '700 ' + (size === 'sm' ? '10px' : '11px') + '/1 var(--mbc-font-sans)',
        letterSpacing: size === 'sm' ? 'var(--mbc-track-label-tight)' : 'var(--mbc-track-label)',
        textTransform: 'uppercase',
        color: EYEBROW_TONES[tone],
        margin: 0,
        ...style,
      }}
    >
      {children}
    </p>
  )
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  on?: 'panel' | 'card'
}

export function Input({ label, on = 'panel', style, ...rest }: FieldProps) {
  const field = (
    <input
      style={{
        width: '100%',
        background: on === 'card' ? 'var(--surface-field)' : 'var(--surface-card)',
        border: '1px solid var(--mbc-border-panel)',
        borderRadius: 'var(--mbc-radius-input)',
        padding: '15px 18px',
        font: '400 16px/1 var(--mbc-font-sans)',
        color: 'var(--text-heading)',
        ...style,
      }}
      {...rest}
    />
  )
  if (!label) return field
  return (
    <label style={{ display: 'grid', gap: 'var(--mbc-space-3)' }}>
      <span
        style={{
          font: '700 11px/1 var(--mbc-font-sans)',
          letterSpacing: 'var(--mbc-track-label-tight)',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      {field}
    </label>
  )
}

/** A hairline rule. Structure is carried by these and by whitespace, not icons. */
export function Rule({ tone = 'section', style }: { tone?: 'section' | 'card' | 'hair' | 'dark'; style?: CSSProperties }) {
  const colours = {
    section: 'var(--border-section)',
    card: 'var(--border-card)',
    hair: 'var(--border-hairline)',
    dark: 'var(--border-dark)',
  }
  return <div style={{ height: 1, background: colours[tone], ...style }} />
}
