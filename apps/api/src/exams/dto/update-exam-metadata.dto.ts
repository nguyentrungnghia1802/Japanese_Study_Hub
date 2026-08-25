import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { UpdateExamMetadataDto } from '@japanese-learning/contracts';

export class UpdateExamMetadataBodyDto implements UpdateExamMetadataDto {
  @ApiPropertyOptional({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Folder UUID or null for root',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @ApiPropertyOptional({ example: 'JLPT N3 Grammar Mock 01 (Revised)', description: 'Exam title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated test description', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: null, description: 'Cover image reference URL' })
  @IsOptional()
  @IsString()
  coverRef?: string | null;

  @ApiPropertyOptional({ example: 2400, description: 'Time limit in seconds or null for untimed' })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitSeconds?: number | null;

  @ApiPropertyOptional({ example: true, description: 'Shuffle question sequence per attempt' })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Shuffle option sequence per question' })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;
}
