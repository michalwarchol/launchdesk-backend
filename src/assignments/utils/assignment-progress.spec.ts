import { describe, expect, it } from 'vitest';

import { deriveAssignmentProgress } from './assignment-progress.js';

describe('deriveAssignmentProgress', () => {
  const steps = ['step-1', 'step-2'];

  it('averages each assignee and is complete only when everyone finished every step', () => {
    const derived = deriveAssignmentProgress({
      assigneeIds: ['a', 'b'],
      stepIds: steps,
      completions: [
        { userId: 'a', taskStepId: 'step-1' },
        { userId: 'a', taskStepId: 'step-2' },
        { userId: 'b', taskStepId: 'step-1' },
      ],
    });

    expect(derived.byAssignee.get('a')).toBe(1);
    expect(derived.byAssignee.get('b')).toBe(0.5);
    expect(derived.progress).toBe(0.75);
    expect(derived.complete).toBe(false);
  });

  it('is complete when every assignee finished every step', () => {
    const derived = deriveAssignmentProgress({
      assigneeIds: ['a', 'b'],
      stepIds: steps,
      completions: [
        { userId: 'a', taskStepId: 'step-1' },
        { userId: 'a', taskStepId: 'step-2' },
        { userId: 'b', taskStepId: 'step-1' },
        { userId: 'b', taskStepId: 'step-2' },
      ],
    });

    expect(derived.progress).toBe(1);
    expect(derived.complete).toBe(true);
  });

  it('ignores completions for steps that are no longer on the task', () => {
    const derived = deriveAssignmentProgress({
      assigneeIds: ['a'],
      stepIds: ['step-1'],
      completions: [
        { userId: 'a', taskStepId: 'step-1' },
        { userId: 'a', taskStepId: 'removed-step' },
      ],
    });

    expect(derived.progress).toBe(1);
    expect(derived.complete).toBe(true);
  });

  it('is not complete when the task has no steps', () => {
    const derived = deriveAssignmentProgress({
      assigneeIds: ['a'],
      stepIds: [],
      completions: [],
    });

    expect(derived.progress).toBe(0);
    expect(derived.complete).toBe(false);
  });
});
