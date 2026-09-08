import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { SURFACES } from './screens/surfaces'
import { SignIn } from './screens/SignIn'
import { Today } from './screens/Today'
import { Huddle } from './screens/Huddle'
import { Cadence } from './screens/Cadence'
import { Discussion } from './screens/Discussion'
import { CarePipelines } from './screens/ComingLater'
import { Communicator } from './screens/Communicator'
import { Goals } from './screens/Goals'
import { People } from './screens/People'
import { NoticeLog } from './screens/NoticeLog'
import { useSession } from './session/session'

export function App() {
  const { member, auth } = useSession()

  /* An opened link arrives with its tokens on the address bar and takes a
     moment to become a session. Showing the sign-in screen in that gap tells
     somebody who has just done everything right that it did not work. */
  if (auth.checking) return <Waiting />
  if (!member) return <SignIn />

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route path="/today" element={<AppShell surface={SURFACES.today}><Today /></AppShell>} />
      <Route path="/huddle" element={<AppShell surface={SURFACES.huddle}><Huddle /></AppShell>} />
      <Route path="/cadence" element={<AppShell surface={SURFACES.cadence}><Cadence /></AppShell>} />
      <Route path="/notice" element={<AppShell surface={SURFACES.notice}><NoticeLog /></AppShell>} />
      <Route path="/discussion" element={<AppShell surface={SURFACES.discussion}><Discussion /></AppShell>} />
      <Route path="/communicator" element={<AppShell surface={SURFACES.communicator}><Communicator /></AppShell>} />
      <Route path="/care" element={<AppShell surface={SURFACES.care}><CarePipelines /></AppShell>} />
      <Route path="/goals" element={<AppShell surface={SURFACES.goals}><Goals /></AppShell>} />
      <Route path="/people" element={<AppShell surface={SURFACES.people}><People /></AppShell>} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  )
}

function Waiting() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--surface-page)' }}>
      <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Signing you in…</p>
    </div>
  )
}
