import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateExamContentDto } from '@japanese-learning/contracts';
import { CreateExamQuestionBodyDto } from './create-exam.dto.js';

export class UpdateExamContentBodyDto implements UpdateExamContentDto {
  @ApiProperty({
    type: [CreateExamQuestionBodyDto],
    description: 'Full replacement question array',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExamQuestionBodyDto)
  questions!: CreateExamQuestionBodyDto[];
}
