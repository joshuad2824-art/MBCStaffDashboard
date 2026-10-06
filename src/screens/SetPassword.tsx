import { useState } from 'react'
import { Button, Eyebrow, Input } from '../components/ui'
import { AccountSetupFrame, AuthMessage, authCopy, authLink } from '../components/AccountSetupFrame'
import { RememberDevice } from '../components/RememberDevice'
import { useSession } from '../session/session'
export function SetPassword() {
  const { member, auth, signOut } = useSession()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    setError(null)
    if (password.length < 8) { setError('Use at least eight characters for your password.'); return }
    if (password !== confirmation) { setError('The two passwords do not match.'); return }
    if (await auth.finishPasswordSetup(password)) { setPassword(''); setConfirmation('') }
  }
  return <AccountSetupFrame>
    <form style={{ display: 'grid', gap: 20 }} onSubmit={event => { event.preventDefault(); void submit() }}>
      <Eyebrow>Email verified</Eyebrow>
      <h2 style={{ font: '600 26px/1.2 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>Choose your password</h2>
      <p style={{ ...authCopy, overflowWrap: 'anywhere' }}>You’re setting up {member?.email}. Use at least eight characters.</p>
      <Input label="New password" on="card" type="password" autoComplete="new-password" minLength={8} required autoFocus value={password} onChange={event => setPassword(event.target.value)} />
      <Input label="Confirm password" on="card" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      <RememberDevice />
      <AuthMessage text={error ?? auth.error} error />
      <Button type="submit" variant="primary" full shape="input" disabled={auth.sending}>{auth.sending ? 'Saving…' : 'Save password and open dashboard'}</Button>
      <button type="button" style={authLink} disabled={auth.sending} onClick={signOut}>Sign out and finish later</button>
    </form>
  </AccountSetupFrame>
}
