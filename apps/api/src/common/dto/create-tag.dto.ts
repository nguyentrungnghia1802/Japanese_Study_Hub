import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreateTagDto } from '@japanese-learning/contracts';

export class CreateTagBodyDto implements CreateTagDto {
  @ApiProperty({ example: 'JLPT N3' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name!: string;
}
