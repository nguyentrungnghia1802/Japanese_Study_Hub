import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { DuplicatePolicy, FlashcardImportConfirmRequestDto } from '@japanese-learning/contracts';

export class ConfirmFlashcardsBodyDto implements FlashcardImportConfirmRequestDto {
  @ApiProperty({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Preview session import token (UUID)',
  })
  @IsUUID()
  @IsNotEmpty()
  importToken!: string;

  @ApiPropertyOptional({
    enum: DuplicatePolicy,
    default: DuplicatePolicy.RENAME,
    description: 'Policy to handle duplicate set titles: RENAME, OVERWRITE, or REJECT',
  })
  @IsOptional()
  @IsEnum(DuplicatePolicy)
  duplicatePolicy?: DuplicatePolicy = DuplicatePolicy.RENAME;
}
