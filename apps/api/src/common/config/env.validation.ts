import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT = 4000;

  @IsString()
  @IsOptional()
  DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/japanese_learning?schema=public';

  @IsString()
  @MinLength(1)
  @IsOptional()
  AUTH_USERNAME = 'admin';

  @IsString()
  @MinLength(1)
  @IsOptional()
  AUTH_PASSWORD_HASH = '$2b$10$ep5q32mC4m1f2.c9NnO1kO.2c8b8D6L4rK/U8b/7u.9/2b8xQ/r6G';

  @IsString()
  @MinLength(16)
  @IsOptional()
  AUTH_TOKEN_SECRET = 'development_super_secret_jwt_key_at_least_32_chars_long';

  @IsString()
  @IsOptional()
  CORS_ORIGINS = 'http://localhost:3000';

  @IsNumber()
  @IsOptional()
  UPLOAD_MAX_BYTES = 10485760;

  @IsString()
  @IsOptional()
  LOG_LEVEL = 'debug';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors.map((e) => Object.values(e.constraints || {})).flat();
    throw new Error(`Environment validation failed:\n${messages.join('\n')}`);
  }
  return validatedConfig;
}
