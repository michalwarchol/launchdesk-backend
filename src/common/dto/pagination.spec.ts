import { describe, expect, it } from 'vitest';

import { buildPaginationMeta, parseSort } from './pagination.dto.js';

describe('pagination helpers', () => {
  it('parses valid sort params', () => {
    expect(parseSort('name:asc', ['name', 'createdAt'])).toEqual({
      key: 'name',
      direction: 'ASC',
    });
  });

  it('rejects invalid sort keys', () => {
    expect(parseSort('password:asc', ['name'])).toBeNull();
  });

  it('builds pagination metadata', () => {
    expect(buildPaginationMeta(2, 10, 25)).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });
});
