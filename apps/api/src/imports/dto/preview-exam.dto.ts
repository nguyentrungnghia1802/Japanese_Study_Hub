import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PreviewExamBodyDto {
  @ApiProperty({
    example:
      '# JLPT N3 Mock\n\nTime: 30\n\n## Question 1\nPrompt\n- A. Option 1\n- B. Option 2\n\n# ANSWER KEY\n1: A',
    description: 'Raw exam markdown content',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
