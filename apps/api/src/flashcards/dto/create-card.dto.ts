import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CreateFlashcardDto } from '@japanese-learning/contracts';

export class CreateCardBodyDto implements CreateFlashcardDto {
  @ApiProperty({ example: '日本語 (にほんご)', description: 'Front content of flashcard' })
  @IsString()
  @IsNotEmpty()
  front!: string;

  @ApiProperty({ example: 'Japanese language', description: 'Back content of flashcard' })
  @IsString()
  @IsNotEmpty()
  back!: string;

  @ApiPropertyOptional({ example: 0, description: 'Position order of card' })
  @IsOptional()
  @IsNumber()
  position?: number;
}
