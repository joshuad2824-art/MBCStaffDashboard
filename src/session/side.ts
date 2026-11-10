/** The two sides of the one application. */
export type Side = 'staff' | 'deacon'

/** Which side a body belongs to. Only the staff roster is the staff side. */
export function sideOfBody(slug: string): Side {
  return slug === 'staff' ? 'staff' : 'deacon'
}
