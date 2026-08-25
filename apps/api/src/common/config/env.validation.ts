import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export const LOCAL_CORS_ORIGIN = 'http://localhost:3000';
export const PRODUCTION_CORS_ORIGIN = 'http://157.173.127.217:3000';

export function getDefaultCorsOrigins(nodeEnv?: string): string {
  return nodeEnv === Environment.Production ? PRODUCTION_CORS_ORIGIN : LOCAL_CORS_ORIGIN;
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
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
  CORS_ORIGINS = LOCAL_CORS_ORIGIN;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  UPLOAD_MAX_BYTES = 10485760;

  @IsString()
  @IsOptional()
  LOG_LEVEL = 'debug';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const configWithCorsDefault = {
    ...config,
    CORS_ORIGINS:
      config.CORS_ORIGINS ?? getDefaultCorsOrigins(config.NODE_ENV as string | undefined),
  };
  const validatedConfig = plainToInstance(EnvironmentVariables, configWithCorsDefault, {
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
