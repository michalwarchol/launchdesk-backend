import { describe, expect, it } from 'vitest';

import { deriveAssignmentStatus } from './assignment-status.js';

describe('deriveAssignmentStatus', () => {
  const today = new Date('2026-09-19T12:00:00.000Z');

  it('returns completed when progress is 1', () => {
    expect(deriveAssignmentStatus(1, '2026-10-01', today)).toBe('completed');
  });

  it('returns overdue when due date passed and progress below 1', () => {
    expect(deriveAssignmentStatus(0.5, '2026-09-01', today)).toBe('overdue');
  });

  it('returns inProgress when progress is above 0 and not overdue', () => {
    expect(deriveAssignmentStatus(0.3, '2026-10-01', today)).toBe('inProgress');
  });

  it('returns notStarted when progress is 0 and not overdue', () => {
    expect(deriveAssignmentStatus(0, '2026-10-01', today)).toBe('notStarted');
  });
});
