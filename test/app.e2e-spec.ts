import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import {
  Document,
  DocumentType,
} from '../src/documents/entities/document.entity.js';
import { MailService } from '../src/mail/mail.service.js';
import { User } from '../src/users/entities/user.entity.js';

describe('LaunchDesk API (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let adminEmail: string;
  let taskId: string;
  let assignmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    adminEmail = `e2e-admin-${Date.now()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        firstName: 'E2E',
        lastName: 'Admin',
        email: adminEmail,
        password: 'password123',
        organizationName: 'E2E Org',
      })
      .expect(201);

    adminToken = registerResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns current user from /auth/me', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.role).toBe('owner');
    expect(response.body.email).toBe(adminEmail);
    expect(response.body.organizationName).toBe('E2E Org');
    expect(response.body.isLastOwner).toBe(true);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/tasks').expect(401);
  });

  it('returns invitePending for invited users', async () => {
    const invitedEmail = `e2e-user-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'E2E',
        lastName: 'User',
        email: invitedEmail,
        role: 'user',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: invitedEmail, password: 'password123' })
      .expect(401);

    expect(loginResponse.body.code).toBe('invitePending');
  });

  it('creates and lists tasks as admin', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'E2E Task',
        description: 'Created in e2e test',
        steps: [
          {
            name: 'Step 1',
            description: '<p>Step body</p>',
            attachmentIds: [],
          },
        ],
      })
      .expect(201);

    taskId = createResponse.body.id;
    expect(createResponse.body.steps).toHaveLength(1);

    const listResponse = await request(app.getHttpServer())
      .get('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      listResponse.body.data.some((task: { id: string }) => task.id === taskId),
    ).toBe(true);
  });

  it('creates and lists assignments as admin', async () => {
    const usersResponse = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const assignee = usersResponse.body.data.find(
      (user: { role: string }) => user.role === 'owner',
    );

    const createResponse = await request(app.getHttpServer())
      .post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        taskId,
        assigneeIds: [assignee.id],
        dueDate: '2026-12-31',
      })
      .expect(201);

    assignmentId = createResponse.body.id;
    expect(createResponse.body.taskName).toBe('E2E Task');
  });

  it('returns dashboard stats', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.totals).toBeDefined();
    expect(response.body.totals.owners).toBeGreaterThanOrEqual(1);
    expect(response.body.statusBreakdown).toHaveLength(4);
  });

  it('refreshes tokens', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'password123' })
      .expect(201);

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: loginResponse.body.refreshToken })
      .expect(201);

    expect(refreshResponse.body.accessToken).toBeTruthy();
    adminToken = refreshResponse.body.accessToken;
  });

  it('deletes assignment as admin', async () => {
    await request(app.getHttpServer())
      .delete(`/api/assignments/${assignmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('limits the user role to profile endpoints', async () => {
    const mail = app.get(MailService);
    let inviteToken = '';
    const spy = vi
      .spyOn(mail, 'sendInviteEmail')
      .mockImplementation(async (_email, token) => {
        inviteToken = token;
      });

    const email = `e2e-member-${Date.now()}@example.com`;

    await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Member',
        lastName: 'User',
        email,
        role: 'user',
      })
      .expect(201);

    spy.mockRestore();

    const acceptResponse = await request(app.getHttpServer())
      .post('/api/auth/invite/accept')
      .send({ token: inviteToken, password: 'password123' })
      .expect(201);

    const userToken = acceptResponse.body.accessToken as string;

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(meResponse.body.role).toBe('user');

    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ firstName: 'Member', lastName: 'Updated' })
      .expect(200);

    const memberId = meResponse.body.id as string;
    const adminMeResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const adminId = adminMeResponse.body.id as string;

    const sharedTask = await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Personal checklist',
        description: 'Finish the checklist before the deadline',
        steps: [
          {
            name: 'Step 1',
            description: '<p>Step body</p>',
            attachmentIds: [],
          },
        ],
      })
      .expect(201);

    const sharedAssignment = await request(app.getHttpServer())
      .post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        taskId: sharedTask.body.id,
        assigneeIds: [memberId, adminId],
        dueDate: '2026-11-15',
      })
      .expect(201);

    const managerTask = await request(app.getHttpServer())
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Quarterly briefing',
        description: 'Visible only to the manager',
        steps: [
          {
            name: 'Step 1',
            description: '<p>Step body</p>',
            attachmentIds: [],
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        taskId: managerTask.body.id,
        assigneeIds: [adminId],
        dueDate: '2026-01-01',
      })
      .expect(201);

    const mineResponse = await request(app.getHttpServer())
      .get('/api/assignments/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(mineResponse.body.data).toEqual([
      {
        id: sharedAssignment.body.id,
        name: 'Personal checklist',
        description: 'Finish the checklist before the deadline',
        dueDate: '2026-11-15',
      },
    ]);
    expect(mineResponse.body.meta).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });

    const minePayload = JSON.stringify(mineResponse.body);
    expect(minePayload).not.toContain(adminId);
    expect(minePayload).not.toContain(memberId);
    expect(minePayload).not.toContain(adminEmail);
    expect(minePayload).not.toContain('Member');
    expect(minePayload).not.toContain('E2E');
    expect(minePayload).not.toContain('Quarterly briefing');

    for (const path of [
      '/api/users',
      '/api/documents',
      '/api/tasks',
      '/api/assignments',
      '/api/dashboard/stats',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    }

    await request(app.getHttpServer())
      .get('/api/documents/00000000-0000-4000-8000-000000000000/download')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('hides resources that belong to another organization', async () => {
    const otherEmail = `e2e-other-${Date.now()}@example.com`;
    const otherResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        firstName: 'Other',
        lastName: 'Admin',
        email: otherEmail,
        password: 'password123',
        organizationName: 'Other Org',
      })
      .expect(201);

    const otherToken = otherResponse.body.accessToken as string;

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const adminId = meResponse.body.id as string;

    await request(app.getHttpServer())
      .get(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const usersResponse = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(
      usersResponse.body.data.some(
        (user: { id: string }) => user.id === adminId,
      ),
    ).toBe(false);

    const tasksResponse = await request(app.getHttpServer())
      .get('/api/tasks')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(
      tasksResponse.body.data.some(
        (task: { id: string }) => task.id === taskId,
      ),
    ).toBe(false);

    const dataSource = app.get(DataSource);
    const admin = await dataSource
      .getRepository(User)
      .findOneByOrFail({ id: adminId });
    const document = await dataSource.getRepository(Document).save(
      dataSource.getRepository(Document).create({
        name: 'secret.pdf',
        type: DocumentType.Text,
        extension: 'pdf',
        size: '10',
        mimeType: 'application/pdf',
        s3Key: 'e2e/secret.pdf',
        uploadedById: adminId,
        organizationId: admin.organizationId,
      }),
    );

    await request(app.getHttpServer())
      .get(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const documentsResponse = await request(app.getHttpServer())
      .get('/api/documents')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(
      documentsResponse.body.data.some(
        (item: { id: string }) => item.id === document.id,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('keeps owner management exclusive to owners', async () => {
    const mail = app.get(MailService);
    let inviteToken = '';
    const spy = vi
      .spyOn(mail, 'sendInviteEmail')
      .mockImplementation(async (_email, token) => {
        inviteToken = token;
      });

    const acceptInvite = async (email: string, role: 'admin' | 'owner') => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Invited',
          lastName: role,
          email,
          role,
        })
        .expect(201);

      const acceptResponse = await request(app.getHttpServer())
        .post('/api/auth/invite/accept')
        .send({ token: inviteToken, password: 'password123' })
        .expect(201);

      return acceptResponse.body.accessToken as string;
    };

    const adminMemberToken = await acceptInvite(
      `e2e-admin-member-${Date.now()}@example.com`,
      'admin',
    );

    const ownerResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const ownerId = ownerResponse.body.id as string;

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const renameResponse = await request(app.getHttpServer())
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed E2E Org' })
      .expect(200);

    expect(renameResponse.body.name).toBe('Renamed E2E Org');

    const renamedMe = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(renamedMe.body.organizationName).toBe('Renamed E2E Org');

    await request(app.getHttpServer())
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${adminMemberToken}`)
      .send({ name: 'Admin Rename' })
      .expect(403);

    const assignOwner = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminMemberToken}`)
      .send({
        firstName: 'Blocked',
        lastName: 'Owner',
        email: `e2e-blocked-owner-${Date.now()}@example.com`,
        role: 'owner',
      })
      .expect(403);

    expect(assignOwner.body.code).toBe('cannotAssignOwner');

    const editOwner = await request(app.getHttpServer())
      .patch(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${adminMemberToken}`)
      .send({ firstName: 'Nope' })
      .expect(403);

    expect(editOwner.body.code).toBe('cannotModifyOwner');

    const deleteOwner = await request(app.getHttpServer())
      .delete(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${adminMemberToken}`)
      .expect(403);

    expect(deleteOwner.body.code).toBe('cannotModifyOwner');

    const demoteSelf = await request(app.getHttpServer())
      .patch(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(400);

    expect(demoteSelf.body.code).toBe('lastOwner');

    const deleteSelf = await request(app.getHttpServer())
      .delete(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(deleteSelf.body.code).toBe('cannotDeleteSelf');

    const secondOwnerEmail = `e2e-second-owner-${Date.now()}@example.com`;
    const secondOwnerToken = await acceptInvite(secondOwnerEmail, 'owner');

    const secondOwner = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${secondOwnerToken}`)
      .expect(200);

    const demoted = await request(app.getHttpServer())
      .patch(`/api/users/${secondOwner.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);

    expect(demoted.body.role).toBe('admin');

    const restored = await request(app.getHttpServer())
      .patch(`/api/users/${secondOwner.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'owner' })
      .expect(200);

    expect(restored.body.role).toBe('owner');

    await request(app.getHttpServer())
      .delete(`/api/users/${secondOwner.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const demoteLast = await request(app.getHttpServer())
      .patch(`/api/users/${ownerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' })
      .expect(400);

    expect(demoteLast.body.code).toBe('lastOwner');

    spy.mockRestore();
  });
});
