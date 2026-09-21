import 'reflect-metadata';

import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

import { AssignmentAssignee } from '../assignments/entities/assignment-assignee.entity.js';
import { Assignment } from '../assignments/entities/assignment.entity.js';
import { Document, DocumentType } from '../documents/entities/document.entity.js';
import { Organization } from '../organizations/entities/organization.entity.js';
import { Task } from '../tasks/entities/task.entity.js';
import { User, UserRole, UserStatus } from '../users/entities/user.entity.js';
import { AppDataSource } from './data-source.js';

config();

function addDaysISO(base: Date, offset: number): string {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const organizationRepo = AppDataSource.getRepository(Organization);
  const userRepo = AppDataSource.getRepository(User);
  const taskRepo = AppDataSource.getRepository(Task);
  const documentRepo = AppDataSource.getRepository(Document);
  const assignmentRepo = AppDataSource.getRepository(Assignment);
  const assignmentAssigneeRepo = AppDataSource.getRepository(AssignmentAssignee);

  const existing = await userRepo.count();
  if (existing > 0) {
    console.info('Database already seeded, skipping.');
    await AppDataSource.destroy();
    return;
  }

  const organization = await organizationRepo.save(
    organizationRepo.create({ name: 'LaunchDesk Demo Org' }),
  );

  const passwordHash = await bcrypt.hash('password123', 10);
  const today = new Date();

  const usersData = [
    ['John', 'Doe', 'john.doe@michalwarchol.com', UserRole.Admin, UserStatus.Active, passwordHash],
    ['Jane', 'Smith', 'jane.smith@michalwarchol.com', UserRole.Admin, UserStatus.Active, passwordHash],
    ['Alex', 'Nowak', 'alex.nowak@michalwarchol.com', UserRole.User, UserStatus.Invited, null],
    ['Maria', 'Garcia', 'maria.garcia@michalwarchol.com', UserRole.User, UserStatus.Active, null],
    ['Tom', 'Brown', 'tom.brown@michalwarchol.com', UserRole.User, UserStatus.Active, passwordHash],
    ['Emma', 'Wilson', 'emma.wilson@michalwarchol.com', UserRole.User, UserStatus.Active, passwordHash],
    ['Lucas', 'Kowalski', 'lucas.kowalski@michalwarchol.com', UserRole.User, UserStatus.Active, passwordHash],
    ['Olivia', 'Taylor', 'olivia.taylor@michalwarchol.com', UserRole.User, UserStatus.Active, passwordHash],
    ['Noah', 'Anderson', 'noah.anderson@michalwarchol.com', UserRole.User, UserStatus.Active, passwordHash],
    ['Sophia', 'Martinez', 'sophia.martinez@michalwarchol.com', UserRole.User, UserStatus.Active, passwordHash],
    ['Ethan', 'Lewandowski', 'ethan.lewandowski@michalwarchol.com', UserRole.Admin, UserStatus.Active, passwordHash],
    ['Jan', 'Kowalczyk', 'jan.kowalczyk@michalwarchol.com', UserRole.Admin, UserStatus.Active, passwordHash],
  ] as const;

  const users = await userRepo.save(
    usersData.map(([firstName, lastName, email, role, status, hash]) =>
      userRepo.create({
        firstName,
        lastName,
        email,
        role,
        status,
        passwordHash: hash,
        avatarUrl: '',
        organizationId: organization.id,
      }),
    ),
  );

  const tasks = await taskRepo.save([
    { name: 'Onboarding', description: 'Introduction workflow for newly hired employees.', createdById: users[0].id },
    { name: 'Compliance training', description: 'Mandatory compliance and policy training.', createdById: users[0].id },
    { name: 'Equipment setup', description: 'Provision laptops, accounts, and access.', createdById: users[1].id },
    { name: 'Performance review', description: 'Quarterly performance review cycle.', createdById: users[1].id },
    { name: 'Offboarding', description: 'Exit checklist for departing employees.', createdById: users[0].id },
    { name: 'Security awareness', description: 'Security best practices and phishing drills.', createdById: users[10].id },
    { name: 'Benefits enrollment', description: 'Annual benefits selection workflow.', createdById: users[11].id },
    { name: 'Mentorship pairing', description: 'Match mentors with new hires.', createdById: users[10].id },
  ].map((task) => taskRepo.create(task)));

  await documentRepo.save([
    { name: 'quarterly-report.pdf', type: DocumentType.Text, extension: 'pdf', size: '2400000', mimeType: 'application/pdf', s3Key: 'seed/quarterly-report.pdf', uploadedById: users[0].id },
    { name: 'onboarding-checklist.docx', type: DocumentType.Text, extension: 'docx', size: '180000', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', s3Key: 'seed/onboarding-checklist.docx', uploadedById: users[1].id },
    { name: 'budget.xlsx', type: DocumentType.Spreadsheet, extension: 'xlsx', size: '92000', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', s3Key: 'seed/budget.xlsx', uploadedById: users[10].id },
    { name: 'team-photo.png', type: DocumentType.Image, extension: 'png', size: '540000', mimeType: 'image/png', s3Key: 'seed/team-photo.png', uploadedById: users[7].id },
    { name: 'policy.txt', type: DocumentType.Text, extension: 'txt', size: '12000', mimeType: 'text/plain', s3Key: 'seed/policy.txt', uploadedById: users[11].id },
  ].map((document) => documentRepo.create(document)));

  const rows = [
    { taskIndex: 1, assigneeIndexes: [1, 7, 8], progress: '1.00', createdOffset: -168, dueOffset: -150, completedOffset: -152 },
    { taskIndex: 0, assigneeIndexes: [0, 1, 2, 3, 4, 5, 6], progress: '1.00', createdOffset: -160, dueOffset: -140, completedOffset: -141 },
    { taskIndex: 2, assigneeIndexes: [9], progress: '1.00', createdOffset: -150, dueOffset: -120, completedOffset: -121 },
    { taskIndex: 3, assigneeIndexes: [0, 10], progress: '1.00', createdOffset: -140, dueOffset: -110, completedOffset: -108 },
    { taskIndex: 4, assigneeIndexes: [2, 3, 4, 5], progress: '1.00', createdOffset: -132, dueOffset: -100, completedOffset: -98 },
    { taskIndex: 5, assigneeIndexes: [1, 4, 6, 8], progress: '1.00', createdOffset: -120, dueOffset: -90, completedOffset: -88 },
    { taskIndex: 0, assigneeIndexes: [7, 8, 9, 10], progress: '1.00', createdOffset: -110, dueOffset: -80, completedOffset: -79 },
    { taskIndex: 6, assigneeIndexes: [3, 5, 11], progress: '1.00', createdOffset: -100, dueOffset: -70, completedOffset: -68 },
    { taskIndex: 1, assigneeIndexes: [0, 2, 4, 6, 10], progress: '1.00', createdOffset: -90, dueOffset: -55, completedOffset: -54 },
    { taskIndex: 7, assigneeIndexes: [1, 9], progress: '1.00', createdOffset: -75, dueOffset: -40, completedOffset: -38 },
    { taskIndex: 3, assigneeIndexes: [5, 6, 7], progress: '0.60', createdOffset: -60, dueOffset: -10 },
    { taskIndex: 2, assigneeIndexes: [10, 11], progress: '0.20', createdOffset: -45, dueOffset: -4 },
    { taskIndex: 5, assigneeIndexes: [0, 3, 8], progress: '0.45', createdOffset: -40, dueOffset: -1 },
    { taskIndex: 0, assigneeIndexes: [4, 5, 6, 7], progress: '0.30', createdOffset: -35, dueOffset: 6 },
    { taskIndex: 4, assigneeIndexes: [1, 2], progress: '0.70', createdOffset: -30, dueOffset: 9 },
    { taskIndex: 6, assigneeIndexes: [0, 9, 10, 11], progress: '0.50', createdOffset: -28, dueOffset: 12 },
    { taskIndex: 1, assigneeIndexes: [3, 4, 5], progress: '0.15', createdOffset: -22, dueOffset: 18 },
    { taskIndex: 7, assigneeIndexes: [6, 8, 10], progress: '0.80', createdOffset: -18, dueOffset: 20 },
    { taskIndex: 2, assigneeIndexes: [0, 1, 11], progress: '0.35', createdOffset: -14, dueOffset: 25 },
    { taskIndex: 3, assigneeIndexes: [2, 7, 9], progress: '0.55', createdOffset: -10, dueOffset: 31 },
    { taskIndex: 0, assigneeIndexes: [8, 9], progress: '0.00', createdOffset: -7, dueOffset: 38 },
    { taskIndex: 5, assigneeIndexes: [1, 4, 10, 11], progress: '0.00', createdOffset: -5, dueOffset: 44 },
    { taskIndex: 4, assigneeIndexes: [5, 6], progress: '0.00', createdOffset: -2, dueOffset: 52 },
  ];

  for (const row of rows) {
    const assignment = await assignmentRepo.save(
      assignmentRepo.create({
        taskId: tasks[row.taskIndex].id,
        progress: row.progress,
        dueDate: addDaysISO(today, row.dueOffset),
        completedAt:
          row.completedOffset !== undefined ? addDaysISO(today, row.completedOffset) : null,
        createdById: users[0].id,
        createdAt: new Date(addDaysISO(today, row.createdOffset)),
      }),
    );

    await assignmentAssigneeRepo.save(
      row.assigneeIndexes.map((index) =>
        assignmentAssigneeRepo.create({
          assignmentId: assignment.id,
          userId: users[index].id,
        }),
      ),
    );
  }

  console.info('Seed completed successfully.');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
