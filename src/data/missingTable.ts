/** Whether PostgREST is saying a table is not there at all — its schema cache
    has no such relation (PGRST205), or Postgres reports an undefined table
    (42P01) — as opposed to refusing a read of one that exists. Only absence is
    forgiven (repository.ts, readLater); a refusal is never mistaken for it. */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST205' || error.code === '42P01') return true
  if (error.code) return false
  return /could not find the table|relation "?[\w.]+"? does not exist/i.test(error.message ?? '')
}
