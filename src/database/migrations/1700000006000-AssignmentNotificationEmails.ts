import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignmentNotificationEmails1700000006000
  implements MigrationInterface
{
  name = 'AssignmentNotificationEmails1700000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "assignmentNotificationEmails" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "assignmentNotificationEmails"`,
    );
  }
}
