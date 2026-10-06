import type { ReactNode } from 'react'
import { Card } from './ui'
export const authCopy = { font: '400 15px/1.65 var(--mbc-font-sans)', color: 'var(--text-body)', margin: 0 } as const
export const authLink = { background: 'none', border: 'none', padding: '8px 0', minHeight: 44, font: '400 14px/1.5 var(--mbc-font-sans)', color: 'var(--text-link)', cursor: 'pointer', textAlign: 'left' } as const
export function AccountSetupFrame({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: 'var(--ui-vh)', display: 'grid', placeItems: 'center', padding: '32px 20px' }}>
    <div style={{ width: '100%', maxWidth: 460 }}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <img src="/assets/mbc-mark.png" alt="" width={44} height={44} style={{ objectFit: 'contain', marginBottom: 18 }} />
        <h1 style={{ font: '600 30px/1.1 var(--mbc-font-serif)', color: 'var(--text-heading)', margin: 0 }}>MBC team dashboard</h1>
        <p style={{ ...authCopy, color: 'var(--text-meta)', marginTop: 10 }}>Memorial Baptist Church · Tulsa</p>
      </div>
      <Card pad={28}>{children}</Card>
      <p style={{ ...authCopy, fontSize: 12, textAlign: 'center', color: 'var(--text-muted)', marginTop: 24 }}>for the glory of God and the good of all people</p>
    </div>
  </div>
}
export function AuthMessage({ text, error = false }: { text: string | null; error?: boolean }) {
  return text ? <p role={error ? 'alert' : 'status'} style={{ ...authCopy, fontSize: 13, color: error ? 'var(--text-error)' : 'var(--text-muted)' }}>{text}</p> : null
}
