import type { GovernanceDocument } from '../meetings/types'

export type { GovernanceDocument }

/** One heading of the manual and the text under it (0016). */
export interface GovernanceSection {
  id: string
  documentId: string
  /** The headings above the section, outermost first, its own last. */
  headingPath: string[]
  /** Stable slug: the URL fragment. */
  anchor: string
  /** As the docket writes them — "Art. II.B §3", "A009 §4" — or '' where nobody cites it. */
  citation: string
  /** Markdown, verbatim, the heading line included. */
  body: string
  position: number
}

/** One row of search_manual(): a section, with its document named. */
export interface SearchHit {
  sectionId: string
  documentId: string
  documentSlug: string
  documentKind: GovernanceDocument['kind']
  documentCode: string
  documentTitle: string
  anchor: string
  citation: string
  headingPath: string[]
  position: number
  /** A citation typed as a string, matched exactly or as a prefix: sits above the text hits. */
  byCitation: boolean
  /** Text with `<mark>` around the matched words. Rendered as the match mark, never as HTML. */
  snippet: string
}
