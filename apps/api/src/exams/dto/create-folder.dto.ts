import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { CreateExamFolderDto } from '@japanese-learning/contracts';

export class CreateFolderBodyDto implements CreateExamFolderDto {
  @ApiProperty({ example: 'JLPT N3', description: 'Folder name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Parent folder UUID',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 0, description: 'Display order position' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
