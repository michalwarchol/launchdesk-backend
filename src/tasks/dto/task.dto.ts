import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateTaskStepDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  description!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds: string[] = [];
}

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTaskStepDto)
  steps!: CreateTaskStepDto[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;
}

export class UpdateTaskStepDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  attachmentIds?: string[];
}

export class ReorderStepsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  stepIds!: string[];
}
