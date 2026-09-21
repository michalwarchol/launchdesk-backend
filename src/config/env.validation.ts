import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  PORT = 4000;

  @IsString()
  @IsNotEmpty()
  NODE_ENV = 'development';

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  DATABASE_PORT = 5432;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @IsString()
  JWT_REFRESH_TTL = '7d';

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL!: string;

  @IsString()
  @IsNotEmpty()
  SMTP_HOST!: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  SMTP_PORT = 1025;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  SMTP_SECURE = false;

  @IsString()
  @IsNotEmpty()
  MAIL_FROM!: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GITHUB_CALLBACK_URL?: string;

  @IsString()
  @IsNotEmpty()
  AWS_REGION!: string;

  @IsString()
  @IsNotEmpty()
  AWS_S3_BUCKET!: string;

  @IsString()
  @IsNotEmpty()
  AWS_ACCESS_KEY_ID!: string;

  @IsString()
  @IsNotEmpty()
  AWS_SECRET_ACCESS_KEY!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const transformed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(transformed, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return transformed;
}

export type { EnvironmentVariables };
