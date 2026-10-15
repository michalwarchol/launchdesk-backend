import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignmentStepCompletions1700000004000 implements MigrationInterface {
  name = 'AssignmentStepCompletions1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assignment_step_completions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "assignmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "taskStepId" uuid NOT NULL,
        "completedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignment_step_completions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assignment_step_completions" UNIQUE ("assignmentId", "userId", "taskStepId"),
        CONSTRAINT "FK_assignment_step_completions_assignment" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_step_completions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_step_completions_step" FOREIGN KEY ("taskStepId") REFERENCES "task_steps"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "progress"`);
    await queryRunner.query(`UPDATE "assignments" SET "completedAt" = NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD "progress" numeric(3,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`DROP TABLE "assignment_step_completions"`);
  }
}
