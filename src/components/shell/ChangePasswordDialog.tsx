import { useEffect, useState } from 'react'
import { Button, Eyebrow, Input, Rule } from '../ui'
import { supabase } from '../../lib/supabase'

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, saving])

  useEffect(() => {
    if (open) return
    setPassword('')
    setConfirmation('')
    setError(null)
    setSaved(false)
  }, [open])

  if (!open) return null

  const submit = async () => {
    setError(null)
    setSaved(false)
    if (password.length < 8) {
      setError('Use at least eight characters for the new password.')
      return
    }
    if (password !== confirmation) {
      setError('The two passwords do not match.')
      return
    }
    if (!supabase) {
      setError('Password changes are available on the connected dashboard.')
      return
    }

    setSaving(true)
    try {
      const { error: failed } = await supabase.auth.updateUser({ password })
      if (failed) {
        const code = (failed as { code?: string }).code ?? ''
        setError(
          code === 'same_password' || /different from the old password/i.test(failed.message)
            ? 'Choose a password that is different from the current one.'
            : failed.message,
        )
        return
      }
      setPassword('')
      setConfirmation('')
      setSaved(true)
    } catch {
      setError('The password could not be updated. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'grid', placeItems: 'center', padding: 20 }}
    >
      <button
        type="button"
        aria-label="Close change password"
        disabled={saving}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'var(--mbc-scrim)', border: 'none', cursor: 'pointer' }}
      />
      <section
        style={{
          position: 'relative',
          width: 'min(440px, 100%)',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-section)',
          borderRadius: 'var(--mbc-radius-panel)',
          padding: '28px',
          display: 'grid',
          gap: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <Eyebrow>Account</Eyebrow>
            <h2
              id="change-password-title"
              style={{
                font: '600 26px/1.2 var(--mbc-font-serif)',
                color: 'var(--text-heading)',
                margin: '10px 0 0',
              }}
            >
              Change password
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            style={{
              background: 'none',
              border: '1px solid var(--border-control)',
              borderRadius: 'var(--mbc-radius-pill)',
              width: 44,
              height: 44,
              cursor: saving ? 'not-allowed' : 'pointer',
              color: 'var(--text-heading)',
              font: '400 16px/1 var(--mbc-font-sans)',
            }}
          >
            ×
          </button>
        </div>

        <Rule />

        {saved ? (
          <div style={{ display: 'grid', gap: 18 }}>
            <p style={{ font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 }}>
              Your password has been updated. Use the new password the next time you sign in.
            </p>
            <Button variant="dark" full shape="input" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <form
            style={{ display: 'grid', gap: 18 }}
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <p style={{ font: '400 14px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: 0 }}>
              Enter a new password with at least eight characters. This changes only the account that is signed in now.
            </p>
            <Input
              label="New password"
              on="card"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              label="Confirm new password"
              on="card"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            {error ? (
              <p role="alert" style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-error)', margin: 0 }}>
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" full shape="input" disabled={saving}>
              {saving ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        )}
      </section>
    </div>
  )
}
