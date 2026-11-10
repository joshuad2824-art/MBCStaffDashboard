/* The one piece of Node the functions use that the typecheck has no types for
   (the project carries no @types/node). Declared narrowly, for unfurl.mts.

   It lives here, not in netlify/functions/: Netlify takes every file in that
   folder for a function, and "node-dns.d" is not a function name it accepts. */
declare module 'node:dns/promises' {
  export function lookup(hostname: string, options: { all: true }): Promise<{ address: string; family: number }[]>
}
