import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';

function parseBoolean(value: unknown): unknown {
  if (value === undefined || typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class DictionaryLookupQueryDto {
  @ApiProperty({ name: 'q', maxLength: 120, example: '日本語' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  q!: string;

  @ApiPropertyOptional({ enum: DictionaryLookupDirection, default: DictionaryLookupDirection.AUTO })
  @IsOptional()
  @IsEnum(DictionaryLookupDirection)
  direction?: DictionaryLookupDirection;

  @ApiPropertyOptional({ minimum: 1, maximum: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({ name: 'includeExamples', default: false })
  @IsOptional()
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  includeExamples?: boolean;
}

export class DictionarySuggestionQueryDto {
  @ApiProperty({ name: 'q', maxLength: 120, example: '日本' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  q!: string;

  @ApiPropertyOptional({ enum: DictionaryLookupDirection, default: DictionaryLookupDirection.AUTO })
  @IsOptional()
  @IsEnum(DictionaryLookupDirection)
  direction?: DictionaryLookupDirection;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}

export class DictionaryHistoryQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DictionaryFavoriteListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number;
}

export class DictionaryFavoriteBodyDto {
  @ApiProperty({ maxLength: 120, example: '日本語' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  term!: string;

  @ApiPropertyOptional({ maxLength: 120, example: 'にほんご' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reading?: string;

  @ApiProperty({ maxLength: 512, example: 'ngôn ngữ Nhật Bản' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  meaningSummary!: string;

  @ApiProperty({ enum: [DictionaryLookupDirection.JA_TO_VI, DictionaryLookupDirection.VI_TO_JA] })
  @IsEnum(DictionaryLookupDirection)
  direction!: DictionaryLookupDirection;

  @ApiProperty({ maxLength: 32, example: 'MINHQND' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  sourceProvider!: string;

  @ApiProperty({ maxLength: 128, example: 'MinhQND Vietnamese Dictionary' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  sourceName!: string;

  @ApiProperty({ maxLength: 512, example: 'https://dict.minhqnd.com/' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  sourceUrl!: string;

  @ApiPropertyOptional({ maxLength: 128, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  sourceLicense?: string;

  @ApiProperty({ maxLength: 255, example: 'MinhQND / dict.minhqnd.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  sourceAttribution!: string;
}
