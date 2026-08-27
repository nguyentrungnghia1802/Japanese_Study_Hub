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
