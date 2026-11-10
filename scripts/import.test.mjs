import test from 'node:test'
import assert from 'node:assert/strict'
import { ageOn, parseCsv, planImport, readDate } from '../src/lib/breezeImport.ts'

/* The Breeze import (home brief §4.5, §4.6). Birthdays are adults only, a
   birthday keeps no year, an age that cannot be told is not assumed adult,
   and a couple sharing an anniversary becomes one line. */

const TODAY = new Date(2026, 10, 10) // 10 November 2026

const CSV = [
  'Breeze ID,First Name,Last Name,Nickname,Birthdate,Anniversary',
  '1,Thomas,Rogers,Tom,03/14/1952,06/12/1976',
  '2,Linda,Rogers,,1954-09-01,06/12/1976',
  '3,Ava,Rogers,,05/02/2015,',
  '4,Noah,Price,,11/11/2008,',          // turns 18 tomorrow: still 17 today
  '5,Grace,Price,,11/10/2008,',         // turns 18 today
  '6,"Mary Ann","O\'Neil, Jr.",,4/5,',  // no year: skipped
  '7,Bill,Carter,,not a date,09/04/2001',
  '8,June,Carter,,,09/04/2001',
].join('\r\n')

test('a quoted field may hold a comma', () => {
  const rows = parseCsv('a,"b, c",d\n"e ""q""",f,g\n')
  assert.deepEqual(rows, [['a', 'b, c', 'd'], ['e "q"', 'f', 'g']])
})

test('dates as Breeze writes them', () => {
  assert.deepEqual(readDate('03/14/1952'), { month: 3, day: 14, year: 1952 })
  assert.deepEqual(readDate('1954-09-01'), { month: 9, day: 1, year: 1954 })
  assert.deepEqual(readDate('4/5'), { month: 4, day: 5, year: null })
  assert.deepEqual(readDate('March 14, 1952'), { month: 3, day: 14, year: 1952 })
  assert.equal(readDate('2/30/1990'), null, 'no 30 February')
  assert.equal(readDate('not a date'), null)
})

test('age is counted to the day', () => {
  assert.equal(ageOn({ month: 11, day: 11, year: 2008 }, TODAY), 17)
  assert.equal(ageOn({ month: 11, day: 10, year: 2008 }, TODAY), 18)
})

test('birthdays: adults only, never a year, never a guess', () => {
  const plan = planImport(CSV, [], TODAY)
  const birthdays = plan.add.filter((d) => d.kind === 'birthday')
  assert.deepEqual(birthdays.map((d) => d.names).sort(), ['Grace Price', 'Linda Rogers', 'Tom Rogers'])
  assert.ok(birthdays.every((d) => d.year === null), 'a birthday keeps no year')
  const reasons = Object.fromEntries(plan.skip.map((s) => [s.names, s.reason]))
  assert.match(reasons['Ava Rogers'], /Under 18/)
  assert.match(reasons['Noah Price'], /Under 18/, 'seventeen until tomorrow')
  assert.match(reasons["Mary Ann O'Neil, Jr."], /No birth year/)
  assert.match(reasons['Bill Carter'], /not readable/)
  assert.equal(plan.columns.birth, 'Birthdate')
})

test('anniversaries: a couple is one line, with its year', () => {
  const plan = planImport(CSV, [], TODAY)
  const anniversaries = plan.add.filter((d) => d.kind === 'anniversary')
  assert.deepEqual(anniversaries.map((d) => [d.names, d.month, d.day, d.year]).sort(), [
    ['Bill and June Carter', 9, 4, 2001],
    ['Tom and Linda Rogers', 6, 12, 1976],
  ])
})

test('against what is already there: add, update, skip', () => {
  const existing = [
    { id: 10, names: 'Tom Rogers', kind: 'birthday', month: 3, day: 14, year: null },
    { id: 11, names: 'linda rogers', kind: 'birthday', month: 9, day: 2, year: null },
  ]
  const plan = planImport(CSV, existing, TODAY)
  assert.ok(plan.skip.some((s) => s.names === 'Tom Rogers' && s.reason === 'Already there'))
  assert.deepEqual(plan.update.map((u) => [u.id, u.now.day]), [[11, 1]], 'a changed date is an update, matched without regard to case')
  assert.ok(!plan.add.some((d) => d.kind === 'birthday' && /Rogers/.test(d.names)))
})

test('a file with no name columns adds nothing', () => {
  const plan = planImport('Email,Phone\na@b.c,555', [], TODAY)
  assert.equal(plan.add.length, 0)
  assert.match(plan.skip[0].reason, /No first-name or last-name column/)
})
