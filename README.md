# LaunchDesk Backend

NestJS REST API for the LaunchDesk application. Provides JWT authentication, role-based access control, and CRUD endpoints for users, tasks, assignments, documents, and dashboard statistics.

## Stack

- NestJS 12 (ESM)
- PostgreSQL 18 + TypeORM
- JWT access/refresh tokens
- AWS S3 for document storage
- Nodemailer (Mailpit in local dev)
- Google + GitHub OAuth

## Quick start

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start Postgres and Mailpit
docker compose up -d

# 3. Install dependencies
npm install

# 4. Run migrations
npm run migration:run

# 5. Seed demo data (optional)
npm run seed

# 6. Start the API
npm run start:dev
```

API: `http://localhost:4000/api`  
Swagger: `http://localhost:4000/api/docs`  
Mailpit UI: `http://localhost:8025`

## Seeded credentials

After running `npm run seed`:

- Email: `john.doe@michalwarchol.com`
- Password: `password123`

## API overview

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `/invite/accept`, `/oauth/exchange` |
| Users | `GET /users`, `POST /users` (admin), `PATCH /users/me`, `POST /users/me/change-password` |
| Tasks | `GET /tasks`, `POST /tasks` (admin), nested step management |
| Assignments | `GET /assignments`, `GET /assignments/me`, `POST /assignments` (admin) |
| Documents | `POST /documents` (multipart), `GET /documents/:id/download` (presigned URL) |
| Dashboard | `GET /dashboard/stats` |

All list endpoints support `?page=1&pageSize=10&sort=key:asc` pagination.

## OAuth handoff

OAuth callbacks redirect to `{FRONTEND_URL}/login?code=...`. The frontend must exchange the code at `POST /api/auth/oauth/exchange` for JWT tokens. This is documented here because the frontend callback page is not yet implemented.

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run migration:run` | Apply pending migrations |
| `npm run seed` | Populate demo data |
| `npm run lint` | Run oxlint |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |

## Environment variables

See [`.env.example`](.env.example) for the full list. Required in all environments:

- `DATABASE_*` — Postgres connection
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `FRONTEND_URL`
- `SMTP_*` / `MAIL_FROM`
- `AWS_REGION` / `AWS_S3_BUCKET` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`

OAuth (`GOOGLE_*`, `GITHUB_*`) is optional — leave blank to disable provider routes.

## Useful commands

- Enter postgres container
```
docker exec -it launchdesk-backend-postgres-1 bash
```
