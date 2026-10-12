import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationScope1700000001000 implements MigrationInterface {
  name = 'OrganizationScope1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "organizationId" uuid`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" ADD "organizationId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD "organizationId" uuid`,
    );

    await queryRunner.query(`
      UPDATE "documents" AS document
      SET "organizationId" = uploader."organizationId"
      FROM "users" AS uploader
      WHERE document."uploadedById" = uploader.id
    `);
    await queryRunner.query(`
      UPDATE "tasks" AS task
      SET "organizationId" = creator."organizationId"
      FROM "users" AS creator
      WHERE task."createdById" = creator.id
    `);
    await queryRunner.query(`
      UPDATE "assignments" AS assignment
      SET "organizationId" = task."organizationId"
      FROM "tasks" AS task
      WHERE assignment."taskId" = task.id
    `);

    await this.assertAssigned(queryRunner, 'documents');
    await this.assertAssigned(queryRunner, 'tasks');
    await this.assertAssigned(queryRunner, 'assignments');

    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "organizationId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "organizationId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ALTER COLUMN "organizationId" SET NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD CONSTRAINT "FK_documents_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD CONSTRAINT "FK_assignments_organization"
      FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_assignments_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" DROP CONSTRAINT "FK_tasks_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP COLUMN "organizationId"`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "organizationId"`);
    await queryRunner.query(
      `ALTER TABLE "documents" DROP COLUMN "organizationId"`,
    );
  }

  private async assertAssigned(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    const rows: { count: string }[] = await queryRunner.query(
      `SELECT COUNT(*)::text AS count FROM "${table}" WHERE "organizationId" IS NULL`,
    );

    if (rows[0]?.count !== '0') {
      throw new Error(
        `Cannot assign organizationId: some ${table} rows have no organization`,
      );
    }
  }
}
