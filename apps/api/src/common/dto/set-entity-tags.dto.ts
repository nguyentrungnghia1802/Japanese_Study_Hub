import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';
import { SetEntityTagsDto } from '@japanese-learning/contracts';

export class SetEntityTagsBodyDto implements SetEntityTagsDto {
  @ApiProperty({
    type: [String],
    maxItems: 20,
    example: ['JLPT N3', 'grammar'],
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  tags!: string[];
}
