export type AssignmentStatus = 'completed' | 'overdue' | 'inProgress' | 'notStarted';

export function deriveAssignmentStatus(
  progress: number,
  dueDate: string,
  today = new Date(),
): AssignmentStatus {
  if (progress >= 1) {
    return 'completed';
  }

  const due = new Date(`${dueDate}T00:00:00.000Z`);
  const current = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  if (due < current) {
    return 'overdue';
  }

  if (progress > 0) {
    return 'inProgress';
  }

  return 'notStarted';
}
