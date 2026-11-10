/* The Breeze import (home brief §4.5): birthdays and anniversaries from a
   Breeze people export, run by the administrator a few times a year. The file
   is read in the browser and never uploaded; what reaches the database is a
   name, a month and a day — and, for an anniversary, its year.

   The rules that keep it inside §4.6:
   * Birthdays are adults only. Anyone under 18 on the day of the import is
     skipped, and so is anyone whose birth year the file does not give — an age
     that cannot be told is not assumed to be adult.
   * A birthday keeps no year, whatever the file says.
   * An anniversary names the couple: two people in the file who share a last
     name and an anniversary date become "Tom and Linda Rogers".

   Pure, and import-free, so scripts/import.test.mjs can run it directly. */

export interface ExistingDate {
  id: number
  names: string
  kind: 'birthday' | 'anniversary'
  month: number
  day: number
  year: number | null
}

export interface PlannedDate {
  names: string
  kind: 'birthday' | 'anniversary'
  month: number
  day: number
  year: number | null
}

export interface ImportPlan {
  add: PlannedDate[]
  update: { id: number; was: ExistingDate; now: PlannedDate }[]
  skip: { names: string; reason: string }[]
  /** Which columns were found, so the screen can say what it read. */
  columns: { first: string | null; last: string | null; birth: string | null; anniversary: string | null }
}

/** RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

/** A date as Breeze might write it: 3/14/1962, 1962-03-14, 3/14, March 14, 1962. */
export function readDate(raw: string): { month: number; day: number; year: number | null } | null {
  const value = raw.trim()
  if (!value) return null
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value)
  if (m) return valid(+m[2], +m[3], +m[1])
  m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(value)
  if (m) {
    let year: number | null = m[3] ? +m[3] : null
    if (year !== null && year < 100) year += year > 30 ? 1900 : 2000
    return valid(+m[1], +m[2], year)
  }
  m = /^([A-Za-z]+)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(value)
  if (m) {
    const month = MONTHS.findIndex((name) => name.startsWith(m![1].slice(0, 3).toLowerCase())) + 1
    return month ? valid(month, +m[2], m[3] ? +m[3] : null) : null
  }
  return null
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function valid(month: number, day: number, year: number | null) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (year !== null && (year < 1900 || year > 2100)) return null
  const check = new Date(year ?? 2000, month - 1, day)
  if (check.getMonth() !== month - 1) return null
  return { month, day, year }
}

/** Whole years old on `today`. */
export function ageOn(birth: { month: number; day: number; year: number }, today: Date): number {
  let age = today.getFullYear() - birth.year
  if (today.getMonth() + 1 < birth.month || (today.getMonth() + 1 === birth.month && today.getDate() < birth.day)) age -= 1
  return age
}

function findColumn(header: string[], ...tests: RegExp[]): number {
  for (const test of tests) {
    const index = header.findIndex((cell) => test.test(cell.trim()))
    if (index >= 0) return index
  }
  return -1
}

const key = (kind: string, names: string) => kind + ':' + names.toLowerCase().replace(/\s+/g, ' ').trim()

/** What an import would add, update and skip — nothing is written here. */
export function planImport(csv: string, existing: ExistingDate[], today: Date): ImportPlan {
  const rows = parseCsv(csv)
  const header = rows[0] ?? []
  const first = findColumn(header, /^nick ?name$/i, /^first( name)?$/i, /first/i)
  const firstFallback = findColumn(header, /^first( name)?$/i, /first/i)
  const last = findColumn(header, /^last( name)?$/i, /last|surname/i)
  const birth = findColumn(header, /^birth ?date$/i, /^birthday$/i, /birth/i)
  const anniversary = findColumn(header, /^anniversary$/i, /anniversary/i)
  const plan: ImportPlan = {
    add: [],
    update: [],
    skip: [],
    columns: {
      first: first >= 0 ? header[first] : null,
      last: last >= 0 ? header[last] : null,
      birth: birth >= 0 ? header[birth] : null,
      anniversary: anniversary >= 0 ? header[anniversary] : null,
    },
  }
  if (first < 0 || last < 0) {
    plan.skip.push({ names: 'The whole file', reason: 'No first-name or last-name column was found' })
    return plan
  }

  const wanted: PlannedDate[] = []
  const couples = new Map<string, { firsts: string[]; last: string; month: number; day: number; year: number | null }>()

  for (const row of rows.slice(1)) {
    const given = (row[first] ?? '').trim() || (row[firstFallback] ?? '').trim()
    const surname = (row[last] ?? '').trim()
    if (!given || !surname) continue
    const name = `${given} ${surname}`

    if (birth >= 0 && (row[birth] ?? '').trim()) {
      const date = readDate(row[birth])
      if (!date) plan.skip.push({ names: name, reason: 'Birthday not readable' })
      else if (date.year === null) plan.skip.push({ names: name, reason: 'No birth year, so no way to tell they are an adult' })
      else if (ageOn({ ...date, year: date.year }, today) < 18) plan.skip.push({ names: name, reason: 'Under 18 — birthdays are adults only' })
      else wanted.push({ names: name, kind: 'birthday', month: date.month, day: date.day, year: null })
    }

    if (anniversary >= 0 && (row[anniversary] ?? '').trim()) {
      const date = readDate(row[anniversary])
      if (!date) plan.skip.push({ names: name, reason: 'Anniversary not readable' })
      else {
        const couple = `${surname.toLowerCase()}|${date.month}|${date.day}|${date.year ?? ''}`
        const found = couples.get(couple)
        if (found) found.firsts.push(given)
        else couples.set(couple, { firsts: [given], last: surname, month: date.month, day: date.day, year: date.year })
      }
    }
  }

  for (const couple of couples.values()) {
    const names = couple.firsts.length > 1 ? `${couple.firsts.slice(0, -1).join(', ')} and ${couple.firsts[couple.firsts.length - 1]} ${couple.last}` : `${couple.firsts[0]} ${couple.last}`
    wanted.push({ names, kind: 'anniversary', month: couple.month, day: couple.day, year: couple.year })
  }

  const byKey = new Map(existing.map((entry) => [key(entry.kind, entry.names), entry]))
  const seen = new Set<string>()
  for (const item of wanted) {
    const k = key(item.kind, item.names)
    if (seen.has(k)) continue
    seen.add(k)
    const was = byKey.get(k)
    if (!was) plan.add.push(item)
    else if (was.month === item.month && was.day === item.day && (item.kind === 'birthday' || was.year === item.year)) plan.skip.push({ names: item.names, reason: 'Already there' })
    else plan.update.push({ id: was.id, was, now: item })
  }
  return plan
}
