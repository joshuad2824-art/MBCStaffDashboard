import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { DataProvider } from './data/store'
import { SessionProvider } from './session/session'
import './styles/tokens.css'
import './styles/global.css'

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
)
