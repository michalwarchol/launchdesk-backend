import { IsArray, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  taskId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds!: string[];

  @IsString()
  dueDate!: string;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeIds?: string[];

  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class SetStepCompletionDto {
  @IsBoolean()
  completed!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
