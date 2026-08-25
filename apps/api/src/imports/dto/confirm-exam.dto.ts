import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { DuplicatePolicy, ExamImportConfirmRequestDto } from '@japanese-learning/contracts';

export class ConfirmExamBodyDto implements ExamImportConfirmRequestDto {
  @ApiProperty({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Preview session import token (UUID)',
  })
  @IsUUID()
  @IsNotEmpty()
  importToken!: string;

  @ApiPropertyOptional({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Target folder UUID or null for root',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @ApiPropertyOptional({
    enum: DuplicatePolicy,
    default: DuplicatePolicy.RENAME,
    description: 'Policy to handle duplicate exam titles: RENAME, OVERWRITE, or REJECT',
  })
  @IsOptional()
  @IsEnum(DuplicatePolicy)
  duplicatePolicy?: DuplicatePolicy = DuplicatePolicy.RENAME;
}
