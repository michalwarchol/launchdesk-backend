import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum ReportPurpose {
  Bug = 'bug',
  Feature = 'feature',
  Other = 'other',
}

export class CreateReportDto {
  @IsEnum(ReportPurpose)
  purpose!: ReportPurpose;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;
}
