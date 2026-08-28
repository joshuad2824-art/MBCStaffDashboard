import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { SURFACES } from './screens/surfaces'
import { SignIn } from './screens/SignIn'
import { Today } from './screens/Today'
import { Huddle } from './screens/Huddle'
import { Cadence } from './screens/Cadence'
import { Discussion } from './screens/Discussion'
import { CarePipelines, Communicator, Goals, NoticeLog } from './screens/ComingLater'
import { useSession } from './session/session'

export function App() {
  const { member } = useSession()
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
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  )
}
