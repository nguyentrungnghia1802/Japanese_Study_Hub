import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UpdateFlashcardSetDto } from '@japanese-learning/contracts';

export class UpdateSetBodyDto implements UpdateFlashcardSetDto {
  @ApiPropertyOptional({ example: 'Updated Set Title', description: 'Title of the set' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Description of the set' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'new-cover-url', description: 'Cover image reference' })
  @IsOptional()
  @IsString()
  coverRef?: string;
}
