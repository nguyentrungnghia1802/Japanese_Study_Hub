import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmitAttemptDto } from '@japanese-learning/contracts';
import { AnswerEntryDto } from './save-answers.dto.js';

export class SubmitAttemptBodyDto implements SubmitAttemptDto {
  @ApiPropertyOptional({
    type: [AnswerEntryDto],
    description: 'Optional final answers to save before submitting',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerEntryDto)
  answers?: AnswerEntryDto[];
}
