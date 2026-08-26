import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { FlashcardReviewRating, SubmitFlashcardReviewDto } from '@japanese-learning/contracts';

export class SubmitReviewBodyDto implements SubmitFlashcardReviewDto {
  @ApiProperty({ enum: ['AGAIN', 'HARD', 'GOOD', 'EASY'], example: 'GOOD' })
  @IsEnum(['AGAIN', 'HARD', 'GOOD', 'EASY'])
  rating!: FlashcardReviewRating;

  @ApiProperty({
    description: 'Client-generated idempotency key; reuse it when retrying the same review.',
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clientRequestId!: string;
}
