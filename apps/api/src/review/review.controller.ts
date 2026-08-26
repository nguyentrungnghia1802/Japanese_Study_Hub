import { Controller, Get, Param, ParseUUIDPipe, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitReviewBodyDto } from './dto/submit-review.dto.js';
import { MAX_REVIEW_QUEUE_ITEMS, ReviewService } from './review.service.js';

@ApiTags('Flashcard review')
@ApiBearerAuth()
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get server-time flashcard review counts' })
  @ApiResponse({ status: 200, description: 'Due, new, and review counts' })
  getSummary() {
    return this.reviewService.getSummary();
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get a bounded queue of due flashcards' })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: MAX_REVIEW_QUEUE_ITEMS })
  @ApiResponse({ status: 200, description: 'Due flashcards ordered by due time and position' })
  getQueue(@Query('limit') limit?: string) {
    const parsed = limit === undefined ? MAX_REVIEW_QUEUE_ITEMS : Number.parseInt(limit, 10);
    return this.reviewService.getQueue(Number.isFinite(parsed) ? parsed : MAX_REVIEW_QUEUE_ITEMS);
  }

  @Post(':cardId')
  @ApiOperation({ summary: 'Submit an idempotent FSRS review rating' })
  @ApiResponse({ status: 201, description: 'Review transition applied or replayed' })
  @ApiResponse({ status: 404, description: 'Active flashcard not found' })
  submitReview(@Param('cardId', ParseUUIDPipe) cardId: string, @Body() dto: SubmitReviewBodyDto) {
    return this.reviewService.submitReview(cardId, dto);
  }
}
