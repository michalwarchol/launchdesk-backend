import { MigrationInterface, QueryRunner } from 'typeorm';

export class PromoteEarliestAdminToOwner1700000003000 implements MigrationInterface {
  name = 'PromoteEarliestAdminToOwner1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users" AS target
      SET "role" = 'owner'
      FROM (
        SELECT DISTINCT ON ("organizationId") "id"
        FROM "users"
        WHERE "role" = 'admin'
          AND "status" = 'active'
          AND "deletedAt" IS NULL
          AND "organizationId" NOT IN (
            SELECT "organizationId"
            FROM "users"
            WHERE "role" = 'owner'
              AND "deletedAt" IS NULL
          )
        ORDER BY "organizationId", "createdAt" ASC, "id" ASC
      ) AS chosen
      WHERE target."id" = chosen."id"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "users" SET "role" = 'admin' WHERE "role" = 'owner'`,
    );
  }
}
