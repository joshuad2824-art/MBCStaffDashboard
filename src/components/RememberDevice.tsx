import { useSession } from '../session/session'
import { AuthMessage } from './AccountSetupFrame'
export function RememberDevice({ compact = false }: { compact?: boolean }) {
  const { auth } = useSession()
  if (auth.mode !== 'supabase') return null
  return <div style={{ display: 'grid', gap: 6 }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, font: `400 ${compact ? 13 : 15}px/1.4 var(--mbc-font-sans)`, color: 'var(--text-body)', cursor: 'pointer' }}>
      <input type="checkbox" checked={auth.rememberDevice} disabled={auth.sending} onChange={event => auth.setRememberDevice(event.target.checked)} style={{ width: 18, height: 18, flex: 'none', accentColor: 'var(--action-primary)' }} />
      Stay signed in on this device
    </label>
    {!compact ? <p style={{ font: '400 12px/1.5 var(--mbc-font-sans)', color: 'var(--text-muted)', margin: 0 }}>Choose this on your own phone or computer. Sign out to forget this device.</p> : null}
    <AuthMessage text={auth.storageNotice} />
  </div>
}
