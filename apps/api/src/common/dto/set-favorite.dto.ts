import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { SetFavoriteDto } from '@japanese-learning/contracts';

export class SetFavoriteBodyDto implements SetFavoriteDto {
  @ApiProperty({ description: 'The desired favorite state; repeating the same value is safe.' })
  @IsBoolean()
  favorite!: boolean;
}
