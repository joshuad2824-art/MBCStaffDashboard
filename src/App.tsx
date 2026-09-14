import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import { SURFACES, surfacesFor } from './screens/surfaces'
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
import { WhichSide } from './screens/WhichSide'
import { Meeting } from './screens/Meeting'
import { Reports } from './screens/Reports'
import { useSession } from './session/session'

/** The screen behind each surface. Keyed the same way as SURFACES. */
const SCREENS: Record<string, ReactNode> = {
  whichSide: <WhichSide />,
  meeting: <Meeting />,
  reports: <Reports />,
  today: <Today />,
  huddle: <Huddle />,
  cadence: <Cadence />,
  notice: <NoticeLog />,
  discussion: <Discussion />,
  communicator: <Communicator />,
  care: <CarePipelines />,
  goals: <Goals />,
  people: <People />,
}

export function App() {
  const { member, bodies, viewAs, sides, context, auth } = useSession()

  /* An opened link arrives with its tokens on the address bar and takes a
     moment to become a session. Showing the sign-in screen in that gap tells
     somebody who has just done everything right that it did not work. */
  if (auth.checking) return <Waiting />
  if (!member) return <SignIn />

  /* Routes exist only for the surfaces this person may open. Typing the path
     of any other gets the same answer as a path that was never there: the
     landing screen. The route refuses; it does not render empty. */
  const open = surfacesFor({ bodies, viewAs, sides, context })
  if (open.length === 0) return <NoSurfaces />
  /* Home is the landing screen for the two people who hold both sides, else
     Today on the staff side and the meeting on the deacon side. */
  const home = (
    open.find((surface) => surface === SURFACES.whichSide) ??
    open.find((surface) => surface === (context === 'deacon' ? SURFACES.meeting : SURFACES.today)) ??
    open[0]
  ).path

  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />
      {open.map((surface) => {
        const key = Object.keys(SURFACES).find((name) => SURFACES[name] === surface) ?? ''
        return (
          <Route
            key={surface.path}
            path={surface.nested ? surface.path + '/*' : surface.path}
            element={<AppShell surface={surface}>{SCREENS[key]}</AppShell>}
          />
        )
      })}
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}

/** Signed in, on the roster, and in no body that has a surface yet. Honest
    rather than empty: this is what a seat with nothing built for it looks like. */
function NoSurfaces() {
  const { member, signOut } = useSession()
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--surface-page)' }}>
      <div style={{ maxWidth: 520, padding: '0 24px', textAlign: 'center' }}>
        <p style={{ font: '600 22px/1.3 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: '0 0 12px' }}>
          Nothing here for you yet, {member?.name.split(' ')[0]}.
        </p>
        <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)', margin: '0 0 20px' }}>
          You are signed in, but none of the bodies you belong to has a surface built for it. Ask the office if you
          were expecting one.
        </p>
        <button
          type="button"
          onClick={signOut}
          style={{ background: 'none', border: 'none', padding: 0, font: '400 14px/1.4 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function Waiting() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--surface-page)' }}>
      <p style={{ font: '400 15px/1.6 var(--mbc-font-sans)', color: 'var(--text-meta)' }}>Signing you in…</p>
    </div>
  )
}
