import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Assignment } from '../assignments/entities/assignment.entity.js';
import { deriveAssignmentStatus } from '../assignments/utils/assignment-status.js';
import { TaskStep } from '../tasks/entities/task-step.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { User, UserRole } from '../users/entities/user.entity.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(TaskStep)
    private readonly taskStepsRepository: Repository<TaskStep>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getStats() {
    const [assignments, tasks, users, stepCount] = await Promise.all([
      this.assignmentsRepository.find({
        relations: {
          task: true,
          assignees: {
            user: true,
          },
        },
      }),
      this.tasksRepository.find(),
      this.usersRepository.find(),
      this.taskStepsRepository.count(),
    ]);

    const statuses = assignments.map((assignment) =>
      deriveAssignmentStatus(Number(assignment.progress), assignment.dueDate),
    );

    const completed = statuses.filter((status) => status === 'completed').length;
    const overdue = statuses.filter((status) => status === 'overdue').length;
    const active = statuses.filter((status) => status === 'inProgress').length;
    const notStarted = statuses.filter((status) => status === 'notStarted').length;

    const monthlyActivity = this.buildMonthlyActivity(assignments);
    const topTasks = this.buildTopTasks(assignments);
    const workload = this.buildWorkload(assignments);
    const upcomingDeadlines = assignments
      .filter((assignment) => Number(assignment.progress) < 1)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
      .map((assignment) => ({
        id: assignment.id,
        taskId: assignment.taskId,
        taskName: assignment.task?.name ?? '',
        assignees: (assignment.assignees ?? []).map((assignee) => ({
          id: assignee.user.id,
          firstName: assignee.user.firstName,
          lastName: assignee.user.lastName,
          avatar: assignee.user.avatarUrl ?? undefined,
        })),
        dueDate: assignment.dueDate,
        progress: Number(assignment.progress),
        status: deriveAssignmentStatus(Number(assignment.progress), assignment.dueDate),
      }));

    const usersWithActiveWork = new Set(
      assignments
        .filter((assignment) => Number(assignment.progress) > 0 && Number(assignment.progress) < 1)
        .flatMap((assignment) => assignment.assignees.map((assignee) => assignee.userId)),
    ).size;

    return {
      totals: {
        assignments: assignments.length,
        completed,
        overdue,
        active,
        notStarted,
        completionRate: assignments.length ? completed / assignments.length : 0,
        tasks: tasks.length,
        averageStepsPerTask: tasks.length ? stepCount / tasks.length : 0,
        users: users.length,
        admins: users.filter((user) => user.role === UserRole.Admin).length,
        usersWithActiveWork,
      },
      statusBreakdown: [
        { status: 'completed', count: completed },
        { status: 'overdue', count: overdue },
        { status: 'inProgress', count: active },
        { status: 'notStarted', count: notStarted },
      ],
      monthlyActivity,
      topTasks,
      workload,
      upcomingDeadlines,
    };
  }

  private buildMonthlyActivity(assignments: Assignment[]) {
    const buckets = new Map<string, { created: number; completed: number }>();

    for (const assignment of assignments) {
      const createdMonth = assignment.createdAt.toISOString().slice(0, 7);
      const createdBucket = buckets.get(createdMonth) ?? { created: 0, completed: 0 };
      createdBucket.created += 1;
      buckets.set(createdMonth, createdBucket);

      if (assignment.completedAt) {
        const completedMonth = assignment.completedAt.slice(0, 7);
        const completedBucket = buckets.get(completedMonth) ?? { created: 0, completed: 0 };
        completedBucket.completed += 1;
        buckets.set(completedMonth, completedBucket);
      }
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, counts]) => ({
        monthKey,
        monthLabel: monthKey,
        created: counts.created,
        completed: counts.completed,
      }));
  }

  private buildTopTasks(assignments: Assignment[]) {
    const counts = new Map<string, { taskId: string; taskName: string; count: number }>();

    for (const assignment of assignments) {
      const existing = counts.get(assignment.taskId) ?? {
        taskId: assignment.taskId,
        taskName: assignment.task?.name ?? '',
        count: 0,
      };
      existing.count += 1;
      counts.set(assignment.taskId, existing);
    }

    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }

  private buildWorkload(assignments: Assignment[]) {
    const counts = new Map<
      string,
      { userId: string; name: string; avatar?: string; count: number }
    >();

    for (const assignment of assignments) {
      for (const assignee of assignment.assignees ?? []) {
        const existing = counts.get(assignee.userId) ?? {
          userId: assignee.userId,
          name: `${assignee.user.firstName} ${assignee.user.lastName}`,
          avatar: assignee.user.avatarUrl ?? undefined,
          count: 0,
        };
        existing.count += 1;
        counts.set(assignee.userId, existing);
      }
    }

    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }
}
