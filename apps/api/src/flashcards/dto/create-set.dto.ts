import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateFlashcardSetDto } from '@japanese-learning/contracts';

export class CreateSetBodyDto implements CreateFlashcardSetDto {
  @ApiProperty({ example: 'JLPT N5 Kanji Set 1', description: 'Title of the flashcard set' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'Essential N5 Kanji for beginners',
    description: 'Description of the set',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'cover-image-url', description: 'Cover image reference or URL' })
  @IsOptional()
  @IsString()
  coverRef?: string;
}
