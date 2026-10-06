import { useState } from 'react'
import { Button, Eyebrow, Input } from '../components/ui'
import { AccountSetupFrame, AuthMessage, authCopy, authLink } from '../components/AccountSetupFrame'
import { RememberDevice } from '../components/RememberDevice'
import { useData } from '../data/store'
import { canSignIn } from '../data/types'
import { useSession } from '../session/session'
type Method = 'password' | 'activate' | 'recover' | 'link'
export function SignIn() {
  const { people } = useData()
  const { signIn, auth } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [method, setMethod] = useState<Method>('password')
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resendAt, setResendAt] = useState(0)
  const live = auth.mode === 'supabase'
  const passwordMode = live && method === 'password'
  const codeMode = live && (method === 'activate' || method === 'recover')
  const shown = error ?? auth.error
  const choose = (next: Method) => {
    setMethod(next); setSent(null); setCode(''); setPassword(''); setError(null); auth.clearError()
  }
  const request = async () => {
    const address = email.trim().toLowerCase()
    setError(null)
    if (!address) { setError('Enter your approved email address.'); return }
    if (passwordMode) {
      if (!password) { setError('Enter your password.'); return }
      await auth.signInWithPassword(address, password)
      return
    }
    if (codeMode && Date.now() < resendAt) { setError('Please wait one minute before requesting another code.'); return }
    const ok = codeMode ? await auth.requestCode(address) : await auth.requestLink(address)
    if (ok) { setSent(address); setCode(''); setResendAt(Date.now() + 60000) }
  }
  const verify = async () => {
    setError(null)
    if (!/^\d{6,10}$/.test(code)) { setError('Enter the complete code from your email.'); return }
    if (sent) await auth.verifyCode(sent, code)
  }
  const openStub = () => {
    const member = people.find(person => person.email.toLowerCase() === sent && canSignIn(person))
    if (member) signIn(member.id)
    else { setError('That link did not sign anyone in. Ask the office to send an invitation.'); setSent(null) }
  }
  return <AccountSetupFrame>
    <div style={{ display: 'grid', gap: 20 }}>
      <Eyebrow>{sent ? codeMode ? 'Check your email' : 'Sign-in link' : method === 'activate' ? 'First time here?' : method === 'recover' ? 'Reset your password' : 'Invite only'}</Eyebrow>
      <p style={{ ...authCopy, overflowWrap: 'anywhere' }}>{sent
        ? codeMode ? `If ${sent} is approved for access, a one-time code is on its way. Enter it here to choose your password. Use the newest code; each code works once.` : `If ${sent} has an account, a one-time sign-in link is on its way. Open it on this device.`
        : codeMode ? 'Enter the email address the church has approved for you. We’ll email a code, then help you choose your own password.'
        : passwordMode ? 'Sign in with your email and password. If you haven’t set a password yet, choose “First time here?” below.'
        : 'Enter your approved email address and we’ll send a one-time sign-in link.'}</p>
      {sent && codeMode ? <form style={{ display: 'grid', gap: 18 }} onSubmit={event => { event.preventDefault(); void verify() }}>
        <Input label="Email code" on="card" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required autoFocus value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))} />
        <RememberDevice />
        <Button type="submit" variant="primary" full shape="input" disabled={auth.sending}>{auth.sending ? 'Checking…' : 'Verify code'}</Button>
      </form> : sent ? <>
        <RememberDevice />
        {!live ? <Button variant="dark" full shape="input" onClick={openStub}>Open the link</Button> : null}
      </> : <form style={{ display: 'grid', gap: 18 }} onSubmit={event => { event.preventDefault(); void request() }}>
        <Input label="Email address" on="card" type="email" autoComplete="email" placeholder="Your approved email address" required value={email} onChange={event => setEmail(event.target.value)} />
        {passwordMode ? <Input label="Password" on="card" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /> : null}
        <RememberDevice />
        <Button type="submit" variant="primary" full shape="input" disabled={auth.sending}>{auth.sending ? passwordMode ? 'Signing in…' : 'Requesting…' : passwordMode ? 'Sign in' : codeMode ? 'Email me a code' : 'Email me a sign-in link'}</Button>
      </form>}
      <AuthMessage text={shown} error />
      {sent ? <div style={{ display: 'grid', gap: 2 }}>
        {codeMode ? <button type="button" style={authLink} disabled={auth.sending} onClick={() => void request()}>Request a new code</button> : null}
        <button type="button" style={authLink} disabled={auth.sending} onClick={() => { setSent(null); setCode(''); setError(null); auth.clearError() }}>Use a different email</button>
        <button type="button" style={authLink} disabled={auth.sending} onClick={() => choose('password')}>Back to sign in</button>
      </div> : live ? <div style={{ display: 'grid', gap: 2 }}>
        {method === 'password' ? <>
          <button type="button" style={authLink} disabled={auth.sending} onClick={() => choose('activate')}>First time here? Activate your account</button>
          <button type="button" style={authLink} disabled={auth.sending} onClick={() => choose('recover')}>Forgot your password?</button>
          <button type="button" style={authLink} disabled={auth.sending} onClick={() => choose('link')}>Use an emailed link instead</button>
        </> : <button type="button" style={authLink} disabled={auth.sending} onClick={() => choose('password')}>Back to sign in</button>}
      </div> : <AuthMessage text="This local preview uses sample data and sends no mail." />}
      <p style={{ ...authCopy, fontSize: 12, color: 'var(--text-muted)', paddingTop: 16, borderTop: '1px solid var(--border-card)' }}>Access is by invitation and role. Activating an account keeps the permissions the church has assigned.</p>
    </div>
  </AccountSetupFrame>
}
