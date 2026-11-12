import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './errors';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function getPagination(query: Record<string, unknown>): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const rawLimit = Number(query.limit) || 25;
  const limit = Math.min(Math.max(rawLimit, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { data: items, meta: buildPaginationMeta(total, page, limit) };
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
export function asyncHandler<T extends RequestHandler>(fn: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Escape a value for safe use inside a CSV cell. */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = Array.isArray(value) ? value.join('; ') : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Escapes a user-provided search term so it is matched literally and cannot
 * be used to trigger a catastrophic-backtracking regular expression.
 */
export function escapeRegex(value: unknown): string {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function toCsv(headers: string[], rows: (string | number | null | undefined | string[])[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  return lines.join('\n');
}
