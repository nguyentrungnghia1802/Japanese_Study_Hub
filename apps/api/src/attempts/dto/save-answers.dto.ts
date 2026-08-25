import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SaveAnswersDto } from '@japanese-learning/contracts';

export class AnswerEntryDto {
  @ApiProperty({ example: '11111111-2222-3333-4444-555555555555', description: 'Question UUID' })
  @IsUUID()
  questionId!: string;

  @ApiPropertyOptional({
    example: '22222222-3333-4444-5555-666666666666',
    description: 'Selected option UUID or null',
  })
  @IsOptional()
  @IsUUID()
  selectedOptionId!: string | null;
}

export class SaveAnswersBodyDto implements SaveAnswersDto {
  @ApiProperty({ type: [AnswerEntryDto], description: 'List of answer selections' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerEntryDto)
  answers!: AnswerEntryDto[];
}
