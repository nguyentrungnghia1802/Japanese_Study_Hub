import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PreviewFlashcardsBodyDto {
  @ApiProperty({
    example: '# JLPT N5 Vocab\n\n## Card 1\n\n### Front\n\n猫\n\n### Back\n\nCat',
    description: 'Raw flashcard markdown content',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
