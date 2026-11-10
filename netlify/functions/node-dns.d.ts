/* The one piece of Node the functions use that the typecheck has no types for
   (the project carries no @types/node). Declared narrowly, for unfurl.mts. */
declare module 'node:dns/promises' {
  export function lookup(hostname: string, options: { all: true }): Promise<{ address: string; family: number }[]>
}
