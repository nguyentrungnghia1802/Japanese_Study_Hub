import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  QuestionType,
  CreateExamDto,
  CreateExamQuestionDto,
  CreateExamOptionDto,
} from '@japanese-learning/contracts';

export class CreateExamOptionBodyDto implements CreateExamOptionDto {
  @ApiProperty({ example: '行く', description: 'Option choice content' })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({ example: true, description: 'Whether this option is the correct answer' })
  @IsBoolean()
  isCorrect!: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Position order index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position = 0;
}

export class CreateExamQuestionBodyDto implements CreateExamQuestionDto {
  @ApiPropertyOptional({ enum: QuestionType, default: QuestionType.MULTIPLE_CHOICE_SINGLE })
  @IsOptional()
  @IsEnum(QuestionType)
  type: QuestionType = QuestionType.MULTIPLE_CHOICE_SINGLE;

  @ApiProperty({
    example: '日本へ＿＿前に、日本語を勉強しました。',
    description: 'Question prompt text',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ example: 0, description: 'Position order index' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position = 0;

  @ApiProperty({ type: [CreateExamOptionBodyDto], description: 'List of 2 to 6 options' })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CreateExamOptionBodyDto)
  options!: CreateExamOptionBodyDto[];
}

export class CreateExamBodyDto implements CreateExamDto {
  @ApiPropertyOptional({
    example: '11111111-2222-3333-4444-555555555555',
    description: 'Folder UUID',
  })
  @IsOptional()
  @IsUUID()
  folderId?: string | null;

  @ApiProperty({ example: 'JLPT N3 Grammar Mock 01', description: 'Exam title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    example: 'Official mock examination format for N3 grammar.',
    description: 'Description',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: null, description: 'Cover image reference URL' })
  @IsOptional()
  @IsString()
  coverRef?: string | null;

  @ApiPropertyOptional({
    example: 1800,
    description: 'Time limit in seconds (or null for untimed)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitSeconds?: number | null;

  @ApiPropertyOptional({ example: false, description: 'Shuffle question sequence per attempt' })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean = false;

  @ApiPropertyOptional({ example: false, description: 'Shuffle option sequence per question' })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean = false;

  @ApiPropertyOptional({ type: [CreateExamQuestionBodyDto], description: 'Initial questions' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamQuestionBodyDto)
  questions?: CreateExamQuestionBodyDto[];
}
