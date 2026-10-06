import { useLocation } from 'react-router-dom'
import { Book1915 } from './rules/Book1915'
import { Guide } from './rules/Guide'

/* Robert's Rules, one surface in two layers. /rules is the plain-language guide
   (rules/Guide.tsx), which is what people open and search; /rules/1915 is
   Robert's own words (rules/Book1915.tsx), which the guide's citations open. */
export function RobertsRules() {
  const { pathname } = useLocation()
  return /^\/rules\/1915(\/|$)/.test(pathname) ? <Book1915 /> : <Guide />
}
