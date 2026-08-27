import { Controller, Get, Query, HttpException, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DictionaryLookupDirection } from '@japanese-learning/contracts';
import {
  DictionaryLookupQueryDto,
  DictionarySuggestionQueryDto,
} from './dto/dictionary-query.dto.js';
import { toDictionaryHttpException } from './dictionary-http-error.js';
import { DictionaryLookupService } from './dictionary-lookup.service.js';

@ApiTags('Dictionary')
@ApiBearerAuth()
@Controller('lookup')
@UseGuards(ThrottlerGuard)
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryLookupService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticated Japanese ↔ Vietnamese dictionary lookup' })
  @ApiQuery({ name: 'q', required: true, type: String, maxLength: 120 })
  @ApiQuery({ name: 'direction', required: false, enum: DictionaryLookupDirection })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 20 })
  @ApiQuery({ name: 'includeExamples', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Normalized dictionary lookup response' })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  @ApiResponse({ status: 404, description: 'No dictionary result' })
  @ApiResponse({ status: 429, description: 'Dictionary rate limit reached' })
  async lookup(@Query() query: DictionaryLookupQueryDto) {
    try {
      return await this.dictionaryService.lookup({
        query: query.q,
        direction: query.direction,
        limit: query.limit,
        includeExamples: query.includeExamples,
      });
    } catch (error) {
      throw this.safeMapError(error);
    }
  }

  @Get('suggest')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticated bounded dictionary suggestions' })
  @ApiQuery({ name: 'q', required: true, type: String, maxLength: 120 })
  @ApiQuery({ name: 'direction', required: false, enum: DictionaryLookupDirection })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 10 })
  @ApiResponse({ status: 200, description: 'Normalized suggestions response' })
  @ApiResponse({ status: 400, description: 'Invalid query' })
  @ApiResponse({ status: 429, description: 'Dictionary suggestion rate limit reached' })
  async suggest(@Query() query: DictionarySuggestionQueryDto) {
    try {
      return await this.dictionaryService.suggest({
        query: query.q,
        direction: query.direction,
        limit: query.limit,
      });
    } catch (error) {
      throw this.safeMapError(error);
    }
  }

  private safeMapError(error: unknown): HttpException {
    return toDictionaryHttpException(error);
  }
}
