import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsInt, Min } from 'class-validator';
import { UpdateExamFolderDto } from '@japanese-learning/contracts';

export class UpdateFolderBodyDto implements UpdateExamFolderDto {
  @ApiPropertyOptional({ example: 'JLPT N3 Grammar', description: 'Folder name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Parent folder UUID or null for root',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 1, description: 'Display order position' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
