import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module.js';

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

    expect(response.body.role).toBe('admin');
    expect(response.body.email).toBe(adminEmail);
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
        steps: [{ name: 'Step 1', description: '<p>Step body</p>', attachmentIds: [] }],
      })
      .expect(201);

    taskId = createResponse.body.id;
    expect(createResponse.body.steps).toHaveLength(1);

    const listResponse = await request(app.getHttpServer())
      .get('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body.data.some((task: { id: string }) => task.id === taskId)).toBe(true);
  });

  it('creates and lists assignments as admin', async () => {
    const usersResponse = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const assignee = usersResponse.body.data.find(
      (user: { role: string }) => user.role === 'admin',
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
});
