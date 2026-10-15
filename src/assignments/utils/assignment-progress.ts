export interface StepCompletionRef {
  userId: string;
  taskStepId: string;
}

export interface DerivedAssignmentProgress {
  /** Average of each assignee's completed-step ratio. */
  progress: number;
  /** True only when every assignee has finished every current step. */
  complete: boolean;
  byAssignee: Map<string, number>;
}

/**
 * Assignment progress is the average of each assignee's share of finished steps.
 * With no assignees or no steps, progress is 0 and the assignment is not complete.
 */
export function deriveAssignmentProgress(input: {
  assigneeIds: string[];
  stepIds: string[];
  completions: StepCompletionRef[];
}): DerivedAssignmentProgress {
  const stepIds = new Set(input.stepIds);
  const assigneeIds = [...new Set(input.assigneeIds)];
  const byAssignee = new Map<string, number>();

  if (assigneeIds.length === 0 || stepIds.size === 0) {
    for (const assigneeId of assigneeIds) byAssignee.set(assigneeId, 0);

    return { progress: 0, complete: false, byAssignee };
  }

  const completedByUser = new Map<string, Set<string>>();

  for (const completion of input.completions) {
    if (!stepIds.has(completion.taskStepId)) continue;

    const completed = completedByUser.get(completion.userId) ?? new Set<string>();
    completed.add(completion.taskStepId);
    completedByUser.set(completion.userId, completed);
  }

  let ratioSum = 0;
  let complete = true;

  for (const assigneeId of assigneeIds) {
    const done = completedByUser.get(assigneeId)?.size ?? 0;
    const ratio = done / stepIds.size;
    byAssignee.set(assigneeId, ratio);
    ratioSum += ratio;

    if (done !== stepIds.size) complete = false;
  }

  return {
    progress: ratioSum / assigneeIds.length,
    complete,
    byAssignee,
  };
}
