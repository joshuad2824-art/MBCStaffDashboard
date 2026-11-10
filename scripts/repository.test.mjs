import test from 'node:test'
import assert from 'node:assert/strict'
import { isMissingTable } from '../src/data/missingTable.ts'

/* The fallback for a migration not yet applied (repository.ts, readLater):
   only a table that is not there reads as empty. A refusal — a policy, a
   permission, an expired session — must still fail loudly, or a broken gate
   would look like an empty page. */

test('a table PostgREST does not know is missing', () => {
  assert.equal(isMissingTable({ code: 'PGRST205', message: "Could not find the table 'public.need' in the schema cache" }), true)
  assert.equal(isMissingTable({ code: '42P01', message: 'relation "public.need" does not exist' }), true)
  assert.equal(isMissingTable({ message: 'relation "need" does not exist' }), true)
})

test('a refusal is not a missing table', () => {
  assert.equal(isMissingTable({ code: '42501', message: 'permission denied for table need' }), false)
  assert.equal(isMissingTable({ code: 'PGRST301', message: 'JWT expired' }), false)
  assert.equal(isMissingTable({ code: '42703', message: 'column need.title does not exist' }), false)
  assert.equal(isMissingTable({ message: 'Failed to fetch' }), false)
  assert.equal(isMissingTable(null), false)
})
