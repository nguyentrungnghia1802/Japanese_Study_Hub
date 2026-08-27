import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamReviewService, MAX_MISTAKE_QUEUE_ITEMS } from './exam-review.service.js';
import { StartPracticeBodyDto } from './dto/start-practice.dto.js';

@ApiTags('Exam review')
@ApiBearerAuth()
@Controller('exam-review')
export class ExamReviewController {
  constructor(private readonly examReviewService: ExamReviewService) {}

  @Get('mistakes')
  @ApiOperation({ summary: 'Get a bounded queue of submitted exam mistakes' })
  @ApiQuery({ name: 'examId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: MAX_MISTAKE_QUEUE_ITEMS })
  @ApiResponse({ status: 200, description: 'Incorrect and unanswered submitted questions' })
  getMistakes(@Query('examId') examId?: string, @Query('limit') limit?: string) {
    const parsed = limit === undefined ? MAX_MISTAKE_QUEUE_ITEMS : Number.parseInt(limit, 10);
    return this.examReviewService.getMistakes(
      examId,
      Number.isFinite(parsed) ? parsed : MAX_MISTAKE_QUEUE_ITEMS,
    );
  }

  @Delete('mistakes')
  @ApiOperation({ summary: 'Clear submitted exam mistakes' })
  @ApiQuery({ name: 'examId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Mistakes dismissed' })
  clearMistakes(@Query('examId') examId?: string) {
    return this.examReviewService.clearMistakes(examId);
  }

  @Delete('mistakes/:id')
  @ApiOperation({ summary: 'Dismiss one submitted exam mistake' })
  @ApiResponse({ status: 200, description: 'Mistake dismissed' })
  @ApiResponse({ status: 404, description: 'Mistake not found' })
  dismissMistake(@Param('id', ParseUUIDPipe) id: string) {
    return this.examReviewService.dismissMistake(id);
  }

  @Get('exams/:examId/mistake-attempts')
  @ApiOperation({ summary: 'List the three newest official mistake histories for an exam' })
  @ApiParam({ name: 'examId', type: String })
  @ApiResponse({ status: 200, description: 'Newest retained official attempt summaries' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  getMistakeAttempts(@Param('examId', ParseUUIDPipe) examId: string) {
    return this.examReviewService.getMistakeAttempts(examId);
  }

  @Get('attempts/:attemptId/mistakes')
  @ApiOperation({ summary: 'Get wrong and unanswered items for one retained official attempt' })
  @ApiParam({ name: 'attemptId', type: String })
  @ApiResponse({ status: 200, description: 'Submitted snapshot review items with answers' })
  @ApiResponse({ status: 400, description: 'Attempt is not an official submitted attempt' })
  @ApiResponse({ status: 404, description: 'Attempt is not retained or not found' })
  getMistakeAttemptDetail(@Param('attemptId', ParseUUIDPipe) attemptId: string) {
    return this.examReviewService.getMistakeAttemptDetail(attemptId);
  }

  @Get('exams/:examId/frequent-mistakes')
  @ApiOperation({ summary: 'Summarize repeated mistakes across retained official attempts' })
  @ApiParam({ name: 'examId', type: String })
  @ApiResponse({ status: 200, description: 'Bounded frequent-mistake summary' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  getFrequentMistakes(@Param('examId', ParseUUIDPipe) examId: string) {
    return this.examReviewService.getFrequentMistakes(examId);
  }

  @Post('practice')
  @ApiOperation({ summary: 'Start an untimed practice attempt from submitted mistakes' })
  @ApiResponse({ status: 201, description: 'Practice attempt without official scoring impact' })
  @ApiResponse({ status: 400, description: 'Mistakes are invalid or from another content version' })
  startPractice(@Body() dto: StartPracticeBodyDto) {
    return this.examReviewService.startPractice(dto);
  }
}
