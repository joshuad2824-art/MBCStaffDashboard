export interface ActivationServices {
  consume(email: string, network: string): Promise<boolean>
  approved(email: string): Promise<boolean>
  ensureAccount(email: string): Promise<void>
  sendCode(email: string, redirectTo: string): Promise<void>
  report(error: unknown): void
}

export function approvedOrigin(origin: string): boolean {
  return ['https://mbctulsa.team', 'https://www.mbctulsa.team', 'https://mbcstaff.netlify.app',
    'https://main--mbcstaff.netlify.app', 'http://localhost:5173', 'http://localhost:5174'].includes(origin)
    || /^https:\/\/[a-f0-9]{24}--mbcstaff\.netlify\.app$/.test(origin)
}

export function activationHandler(services: ActivationServices) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin') ?? ''
    const headers = { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    const reply = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers })
    if (!approvedOrigin(origin)) return new Response('Forbidden', { status: 403 })
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
    if (Number(request.headers.get('content-length') ?? 0) > 2048) return reply({ error: 'Invalid request' }, 400)
    let email: string
    try {
      const body = await request.text()
      if (body.length > 2048) return reply({ error: 'Invalid request' }, 400)
      const input = JSON.parse(body)
      email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ error: 'Enter a valid email address' }, 400)
    } catch { return reply({ error: 'Invalid request' }, 400) }
    try {
      const network = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
      if (!await services.consume(email, network)) return reply({ error: 'Please wait before requesting another code' }, 429)
      // Reply identically whether approved or not. Only existing approval grants eligibility.
      if (await services.approved(email)) {
        try {
          await services.ensureAccount(email)
          await services.sendCode(email, 'https://mbctulsa.team/?setup=password')
        } catch (error) { services.report(error) }
      }
      return reply({ requested: true })
    } catch (error) {
      services.report(error)
      return reply({ error: 'Code requests are temporarily unavailable' }, 503)
    }
  }
}
