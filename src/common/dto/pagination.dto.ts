import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @IsOptional()
  @IsString()
  sort?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function parseSort(
  sort: string | undefined,
  allowedKeys: readonly string[],
): { key: string; direction: 'ASC' | 'DESC' } | null {
  if (!sort) {
    return null;
  }

  const [key, direction] = sort.split(':');

  if (!key || !allowedKeys.includes(key)) {
    return null;
  }

  if (direction !== 'asc' && direction !== 'desc') {
    return null;
  }

  return { key, direction: direction === 'asc' ? 'ASC' : 'DESC' };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
