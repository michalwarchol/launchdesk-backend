import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'invited')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oauth_accounts_provider_enum" AS ENUM('google', 'github')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."documents_type_enum" AS ENUM('image', 'spreadsheet', 'text')`,
    );

    await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "firstName" character varying(100) NOT NULL,
        "lastName" character varying(100) NOT NULL,
        "email" character varying(255) NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "avatarUrl" character varying(500),
        "passwordHash" character varying(255),
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'invited',
        "organizationId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying(255) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "invite_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying(255) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invite_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invite_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying(255) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "provider" "public"."oauth_accounts_provider_enum" NOT NULL,
        "providerAccountId" character varying(255) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_accounts_provider_account" UNIQUE ("provider", "providerAccountId"),
        CONSTRAINT "FK_oauth_accounts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "oauth_exchange_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "codeHash" character varying(255) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "usedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_exchange_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_oauth_exchange_codes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "description" text NOT NULL,
        "createdById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasks_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_steps" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "taskId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "position" integer NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_steps" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_steps_task" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "type" "public"."documents_type_enum" NOT NULL,
        "extension" character varying(20) NOT NULL,
        "size" bigint NOT NULL,
        "mimeType" character varying(255) NOT NULL,
        "s3Key" character varying(500) NOT NULL,
        "uploadedById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_documents_uploaded_by" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_step_attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "taskStepId" uuid NOT NULL,
        "documentId" uuid NOT NULL,
        "position" integer NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_step_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_task_step_attachments" UNIQUE ("taskStepId", "documentId"),
        CONSTRAINT "FK_task_step_attachments_step" FOREIGN KEY ("taskStepId") REFERENCES "task_steps"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_step_attachments_document" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assignments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "taskId" uuid NOT NULL,
        "progress" numeric(3,2) NOT NULL DEFAULT 0,
        "dueDate" date NOT NULL,
        "completedAt" date,
        "createdById" uuid,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assignments_task" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignments_created_by" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assignment_assignees" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "assignmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignment_assignees" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assignment_assignees" UNIQUE ("assignmentId", "userId"),
        CONSTRAINT "FK_assignment_assignees_assignment" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_assignees_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assignment_assignees"`);
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(`DROP TABLE "task_step_attachments"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TABLE "task_steps"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "oauth_exchange_codes"`);
    await queryRunner.query(`DROP TABLE "oauth_accounts"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP TABLE "invite_tokens"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TYPE "public"."documents_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."oauth_accounts_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
