/**
 * Keyset pagination for PostgREST lists ordered by `column desc, id desc`.
 * Offset pagination breaks down on large tables (it re-scans the skipped rows
 * and shifts when new rows arrive), so the lists use a cursor instead.
 */
export const PAGE_SIZE = 25;

export interface PageCursor {
  value: string;
  id: string;
}

export function pageCursor(
  rows: Array<{ id: string }>,
  column: string,
): PageCursor | null {
  if (rows.length === 0) return null;
  const last = rows[rows.length - 1];
  const value = (last as unknown as Record<string, unknown>)[column];
  if (typeof value !== 'string' || !last.id) return null;
  return { value, id: last.id };
}

/**
 * Applies the cursor predicate to an already-filtered, already-ordered query.
 * Values are ISO timestamps or UUIDs, so they never contain the commas that
 * would need quoting inside PostgREST's `or` expression.
 */
export function afterCursor<T>(query: T, cursor: PageCursor | null, column: string): T {
  if (!cursor) return query;
  const predicate = `${column}.lt.${cursor.value},and(${column}.eq.${cursor.value},id.lt.${cursor.id})`;
  return (query as unknown as { or: (filter: string) => T }).or(predicate);
}

/** True when the database returned one extra row, i.e. another page exists. */
export function hasNextPage<T>(rows: T[], size: number = PAGE_SIZE): boolean {
  return rows.length > size;
}

/**
 * Charts plot a bounded series. A device sampling every minute fills a 30-day
 * window with ~43k rows, so vitals reads cap here and the UI says when the
 * displayed window is truncated.
 */
export const VITALS_SERIES_LIMIT = 2000;
