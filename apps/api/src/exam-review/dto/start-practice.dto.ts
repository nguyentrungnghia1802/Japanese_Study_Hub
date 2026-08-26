import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { StartMistakePracticeDto } from '@japanese-learning/contracts';
import { MAX_MISTAKE_QUEUE_ITEMS } from '../exam-review.service.js';

export class StartPracticeBodyDto implements StartMistakePracticeDto {
  @ApiProperty({ description: 'Exam owning the selected mistake rows' })
  @IsUUID()
  examId!: string;

  @ApiProperty({ type: [String], maxItems: MAX_MISTAKE_QUEUE_ITEMS })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_MISTAKE_QUEUE_ITEMS)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  mistakeIds!: string[];
}
