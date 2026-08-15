/** Helpers for feeding user input into PostgREST filters safely.
 *
 *  PostgREST parses `or=(a.ilike.%x%,b.ilike.%x%)` as structured text, so a
 *  `)` or `,` in the search box terminates the expression early and the rest
 *  is reinterpreted as filter syntax. Stripping a couple of characters is not
 *  enough — the value has to be quoted.
 */

/** Removes SQL LIKE wildcards so a literal `%` or `_` typed by the user is not
 *  silently treated as "match anything". */
export function stripLikeWildcards(term: string): string {
  return term.replace(/[%_]/g, '');
}

/** Wraps a value in PostgREST's double-quote form, escaping backslashes and
 *  quotes, so no character in it can break out of the surrounding filter. */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Ready-to-embed `ilike` pattern for a user-supplied search term. */
export function likePattern(term: string): string {
  return quoteFilterValue(`%${stripLikeWildcards(term.trim())}%`);
}
