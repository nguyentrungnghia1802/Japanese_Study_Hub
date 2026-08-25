import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { UpdateFlashcardDto } from '@japanese-learning/contracts';

export class UpdateCardBodyDto implements UpdateFlashcardDto {
  @ApiPropertyOptional({ example: 'Updated Front', description: 'Front content' })
  @IsOptional()
  @IsString()
  front?: string;

  @ApiPropertyOptional({ example: 'Updated Back', description: 'Back content' })
  @IsOptional()
  @IsString()
  back?: string;

  @ApiPropertyOptional({ example: 1, description: 'Position order' })
  @IsOptional()
  @IsNumber()
  position?: number;
}
