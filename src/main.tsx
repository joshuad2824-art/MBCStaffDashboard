import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { DataProvider } from './data/store'
import { MeetingsProvider } from './data/meetings/store'
import { ReferenceProvider } from './data/reference/store'
import { CareProvider } from './data/care/store'
import { SessionProvider } from './session/session'
import './styles/tokens.css'
import './styles/global.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <SessionProvider>
          <ReferenceProvider>
            <MeetingsProvider>
              <CareProvider>
                <App />
              </CareProvider>
            </MeetingsProvider>
          </ReferenceProvider>
        </SessionProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
