"use strict";
/**
 * Helpers simples para paginação e ordenação com whitelists (evita SQL injection).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.parseSort = parseSort;
function parsePagination(query) {
    const page = Math.max(1, Number(query.page ?? 1));
    const sizeRaw = Number(query.size ?? 10);
    const size = Math.min(100, Math.max(1, isNaN(sizeRaw) ? 10 : sizeRaw));
    const offset = (page - 1) * size;
    const limit = size;
    return { page, size, offset, limit };
}
function parseSort(sortParam, allowed, fallback = { column: 'name', direction: 'ASC' }) {
    if (!sortParam)
        return fallback;
    const [colRaw, dirRaw] = String(sortParam).split(':');
    const column = allowed.includes(colRaw) ? colRaw : fallback.column;
    const direction = (String(dirRaw || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
    return { column, direction };
}
