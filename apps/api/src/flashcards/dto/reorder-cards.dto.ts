import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ReorderFlashcardsDto } from '@japanese-learning/contracts';

export class ReorderCardsBodyDto implements ReorderFlashcardsDto {
  @ApiProperty({
    example: ['d98c2534-1111-4222-8333-555555555555', 'a18c2534-2222-4333-8444-666666666666'],
    description: 'Ordered list of card UUIDs in their new sequence',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  cardIds!: string[];
}
