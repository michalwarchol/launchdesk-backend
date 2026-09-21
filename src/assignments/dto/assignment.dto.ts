import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  progress?: number;
}
