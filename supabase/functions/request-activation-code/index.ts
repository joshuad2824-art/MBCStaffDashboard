import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { activationHandler } from './core.ts'

const url = Deno.env.get('SUPABASE_URL')!
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
const encoder = new TextEncoder()
const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
async function digest(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))))
    .map(byte => byte.toString(16).padStart(2, '0')).join('')
}
Deno.serve(activationHandler({
  async consume(email, network) {
    const { data, error } = await admin.rpc('consume_activation_request', {
      email_key: await digest('email:' + email), network_key: await digest('network:' + network),
    })
    if (error) throw error
    return data === true
  },
  async approved(email) {
    const { data, error } = await admin.from('person').select('id').eq('email', email).eq('active', true).neq('access', 'none').maybeSingle()
    if (error) throw error
    return Boolean(data)
  },
  async ensureAccount(email) {
    // Provision a passwordless account only after checking existing approval.
    // Auth's invite-only setting requires a provisioned account for OTP login.
    // No session is issued here: the visitor must still prove mailbox access
    // with the emailed code. Existing passwords and roles are never changed.
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true })
    if (error && !['email_exists', 'user_already_exists'].includes(error.code ?? '')) throw error
  },
  async sendCode(email, redirectTo) {
    const { error } = await auth.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } })
    if (error) throw error
  },
  report(error) {
    // Log an operator-actionable error code without addresses, tokens, or request bodies.
    console.error('Activation delivery error:', (error as { code?: string }).code ?? 'unavailable')
  },
}))
