import { useState } from 'react'
import { Button, Card, Eyebrow, Input } from '../components/ui'
import { useData } from '../data/store'
import { useSession } from '../session/session'

/* Invite-only. There is no sign-up and no password.

   While the app runs on seed data the link is not really sent — "Open the link"
   stands in for clicking it in your inbox. Supabase Auth replaces the two
   handlers below and nothing else on this screen moves. */

export function SignIn() {
  const { staff } = useData()
  const { signIn } = useSession()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const requestLink = () => {
    const address = email.trim().toLowerCase()
    if (!address) {
      setError('Enter your church email address.')
      return
    }
    // A real magic link never says whether the address is on staff — that would
    // turn the form into a roster. The stub keeps the same silence.
    setError(null)
    setSent(address)
  }

  const openLink = () => {
    const member = staff.find((person) => person.email.toLowerCase() === sent && person.active)
    if (!member) {
      setError('That link did not sign anyone in. Ask the office to send an invitation.')
      setSent(null)
      return
    }
    signIn(member.id)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 430 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 30 }}>
          <img src="/assets/mbc-mark.png" alt="" width={44} height={44} style={{ objectFit: 'contain' }} />
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                font: '600 30px/1.1 var(--mbc-font-serif)',
                letterSpacing: '-.02em',
                color: 'var(--text-heading)',
                margin: 0,
              }}
            >
              Staff dashboard
            </p>
            <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '10px 0 0' }}>
              Memorial Baptist Church · Tulsa
            </p>
          </div>
        </div>

        <Card pad={34}>
          {sent === null ? (
            <form
              style={{ display: 'grid', gap: 22 }}
              onSubmit={(event) => {
                event.preventDefault()
                requestLink()
              }}
            >
              <div>
                <Eyebrow>Invite only</Eyebrow>
                <p
                  style={{
                    font: '400 15px/1.65 var(--mbc-font-sans)',
                    color: 'var(--text-body)',
                    margin: '12px 0 0',
                    maxWidth: '46ch',
                  }}
                >
                  There is no sign-up. If you are on staff, enter your church email and we will send a link that signs
                  you in for thirty days.
                </p>
              </div>
              <Input
                label="Church email"
                on="card"
                type="email"
                autoComplete="email"
                placeholder="name@memorialbaptist.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Button type="submit" variant="primary" full shape="input">
                Email me a sign-in link
              </Button>
              {error ? (
                <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-error)', margin: 0 }}>
                  {error}
                </p>
              ) : null}
              <p
                style={{
                  font: '400 13px/1.6 var(--mbc-font-sans)',
                  color: 'var(--text-muted)',
                  margin: 0,
                  paddingTop: 20,
                  borderTop: '1px solid var(--border-card)',
                }}
              >
                Care pipelines and the discussion board hold named members’ circumstances. Access is by role, enforced
                in the database.
              </p>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: 22 }}>
              <div>
                <Eyebrow tone="sage">Link sent</Eyebrow>
                <p
                  style={{
                    font: '600 22px/1.3 var(--mbc-font-serif)',
                    color: 'var(--text-heading)',
                    margin: '12px 0 0',
                  }}
                >
                  Check your inbox.
                </p>
                <p style={{ font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: '12px 0 0' }}>
                  We sent a link to {sent}. It expires in fifteen minutes and can be used once.
                </p>
              </div>
              <Button variant="dark" full shape="input" onClick={openLink}>
                Open the link
              </Button>
              {error ? (
                <p style={{ font: '400 13px/1.6 var(--mbc-font-sans)', color: 'var(--text-error)', margin: 0 }}>
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSent(null)
                  setError(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: '400 14px/1.5 var(--mbc-font-sans)',
                  color: 'var(--text-link)',
                  cursor: 'pointer',
                  justifySelf: 'start',
                }}
              >
                Use a different email
              </button>
            </div>
          )}
        </Card>

        <p
          style={{
            font: '400 12px/1.6 var(--mbc-font-sans)',
            color: 'var(--text-muted)',
            textAlign: 'center',
            margin: '26px 0 0',
          }}
        >
          for the glory of God and the good of all people
        </p>
      </div>
    </div>
  )
}
