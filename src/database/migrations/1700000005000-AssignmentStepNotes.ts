import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignmentStepNotes1700000005000 implements MigrationInterface {
  name = 'AssignmentStepNotes1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_steps" ADD "notesRequired" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(`
      CREATE TABLE "assignment_step_notes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "assignmentId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "taskStepId" uuid NOT NULL,
        "notes" text NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignment_step_notes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assignment_step_notes" UNIQUE ("assignmentId", "userId", "taskStepId"),
        CONSTRAINT "FK_assignment_step_notes_assignment" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_step_notes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_assignment_step_notes_step" FOREIGN KEY ("taskStepId") REFERENCES "task_steps"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assignment_step_notes"`);
    await queryRunner.query(`ALTER TABLE "task_steps" DROP COLUMN "notesRequired"`);
  }
}
