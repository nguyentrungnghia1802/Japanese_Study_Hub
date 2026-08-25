import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AttemptsService } from './attempts.service.js';
import { SaveAnswersBodyDto } from './dto/save-answers.dto.js';
import { SubmitAttemptBodyDto } from './dto/submit-attempt.dto.js';

@ApiTags('Exam Attempts')
@ApiBearerAuth()
@Controller()
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post('exams/:id/attempts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new exam attempt and snapshot ordering' })
  @ApiResponse({ status: 201, description: 'Live exam attempt with questions (NO answer leakage)' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async startAttempt(@Param('id', ParseUUIDPipe) id: string) {
    return this.attemptsService.startAttempt(id);
  }

  @Get('attempts/:attemptId')
  @ApiOperation({ summary: 'Restore or view an active/submitted attempt' })
  @ApiResponse({ status: 200, description: 'Attempt state with saved answers' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  async getAttempt(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.attemptsService.getAttempt(attemptId);
  }

  @Put('attempts/:attemptId/answers')
  @ApiOperation({ summary: 'Save in-progress answer selections' })
  @ApiResponse({ status: 200, description: 'Answers saved' })
  @ApiResponse({ status: 400, description: 'Invalid question/option or expired' })
  async saveAnswers(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SaveAnswersBodyDto,
  ) {
    return this.attemptsService.saveAnswers(attemptId, dto);
  }

  @Post('attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit and finalize exam attempt with authoritative scoring' })
  @ApiResponse({ status: 200, description: 'Graded exam results with answers and best score' })
  @ApiResponse({ status: 404, description: 'Attempt not found' })
  async submitAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto?: SubmitAttemptBodyDto,
  ) {
    return this.attemptsService.submitAttempt(attemptId, dto);
  }
}
