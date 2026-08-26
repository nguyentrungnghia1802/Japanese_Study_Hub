import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UpdateTagDto } from '@japanese-learning/contracts';

export class UpdateTagBodyDto implements UpdateTagDto {
  @ApiProperty({ example: 'JLPT N3 grammar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name!: string;
}
