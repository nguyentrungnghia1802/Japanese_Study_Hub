import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LearningService, MAX_RECENT_RESPONSE_ITEMS } from './learning.service.js';

@ApiTags('Learning')
@ApiBearerAuth()
@Controller()
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('recent-learning')
  @ApiOperation({ summary: 'Get a bounded recent learning/resume list' })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: MAX_RECENT_RESPONSE_ITEMS })
  async listRecent(@Query('limit') limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : MAX_RECENT_RESPONSE_ITEMS;
    return this.learningService.listRecent(
      Number.isFinite(parsed) ? parsed : MAX_RECENT_RESPONSE_ITEMS,
    );
  }
}
