import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service.js';

@ApiTags('Search & Dashboard')
@ApiBearerAuth()
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @ApiOperation({ summary: 'Cross-domain search across flashcards, sets, exams, and folders' })
  @ApiResponse({ status: 200, description: 'Grouped search results (maximum 30 per group)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: 30 })
  async search(@Query('q') query = '', @Query('limit') limit = '20') {
    const parsedLimit = parseInt(limit, 10);
    const numLimit = Number.isFinite(parsedLimit) ? Math.min(30, Math.max(1, parsedLimit)) : 20;
    return this.searchService.search(query, numLimit);
  }

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get unified learning dashboard metrics and recent items' })
  @ApiResponse({ status: 200, description: 'Dashboard stats and recent learning content' })
  async getDashboardSummary() {
    return this.searchService.getDashboardSummary();
  }
}
