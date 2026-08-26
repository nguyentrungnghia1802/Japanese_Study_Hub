import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { LoginRequestDto } from '@japanese-learning/contracts';

export class LoginBodyDto implements LoginRequestDto {
  @ApiProperty({ example: 'admin', description: 'Learner username' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: '<password>', description: 'Learner password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password!: string;
}
