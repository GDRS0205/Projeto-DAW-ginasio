/**
 * Helpers simples para paginação e ordenação com whitelists (evita SQL injection).
 */

export function parsePagination(query: any) {
  const page = Math.max(1, Number(query.page ?? 1));
  const sizeRaw = Number(query.size ?? 10);
  const size = Math.min(100, Math.max(1, isNaN(sizeRaw) ? 10 : sizeRaw));
  const offset = (page - 1) * size;
  const limit = size;
  return { page, size, offset, limit };
}

type SortSpec = { column: string; direction: 'ASC' | 'DESC' };

export function parseSort(
  sortParam: string | undefined,
  allowed: string[],
  fallback: SortSpec = { column: 'name', direction: 'ASC' }
): SortSpec {
  if (!sortParam) return fallback;

  const [colRaw, dirRaw] = String(sortParam).split(':');
  const column = allowed.includes(colRaw) ? colRaw : fallback.column;
  const direction = (String(dirRaw || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC') as
    | 'ASC'
    | 'DESC';

  return { column, direction };
}
