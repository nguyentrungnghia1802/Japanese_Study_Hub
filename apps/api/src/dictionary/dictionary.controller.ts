import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Logger,
  Optional,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DictionaryErrorCode, DictionaryLookupDirection } from '@japanese-learning/contracts';
import {
  DictionaryFavoriteBodyDto,
  DictionaryFavoriteListQueryDto,
  DictionaryHistoryQueryDto,
  DictionaryLookupQueryDto,
  DictionarySuggestionQueryDto,
} from './dto/dictionary-query.dto.js';
import { toDictionaryHttpException } from './dictionary-http-error.js';
import { DictionaryDomainError } from './dictionary-domain-error.js';
import { DictionaryFavoritesService } from './dictionary-favorites.service.js';
import { DictionaryHistoryService } from './dictionary-history.service.js';
import { DictionaryLookupService } from './dictionary-lookup.service.js';

@ApiTags('Dictionary')
@ApiBearerAuth()
@Controller('lookup')
@UseGuards(ThrottlerGuard)
export class DictionaryController {
  private readonly logger = new Logger(DictionaryController.name);

  constructor(
    @Inject(DictionaryLookupService)
    private readonly dictionaryService: DictionaryLookupService,
    @Optional()
    @Inject(DictionaryHistoryService)
    private readonly historyService?: DictionaryHistoryService,
    @Optional()
    @Inject(DictionaryFavoritesService)
    private readonly favoritesService?: DictionaryFavoritesService,
  ) {}

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
      const result = await this.dictionaryService.lookup({
        query: query.q,
        direction: query.direction,
        limit: query.limit,
        includeExamples: query.includeExamples,
      });
      await this.recordHistory(result);
      return result;
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

  @Get('history')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'List bounded authenticated dictionary lookup history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiResponse({ status: 200, description: 'Recent compact lookup history' })
  async history(@Query() query: DictionaryHistoryQueryDto) {
    try {
      if (!this.historyService) throw new Error('Dictionary history service is unavailable');
      return await this.historyService.list(query.limit);
    } catch (error) {
      throw this.safeMapError(error);
    }
  }

  @Delete('history')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Clear authenticated dictionary lookup history' })
  @ApiResponse({ status: 200, description: 'History rows removed' })
  async clearHistory() {
    try {
      if (!this.historyService) throw new Error('Dictionary history service is unavailable');
      return await this.historyService.clear();
    } catch (error) {
      throw this.safeMapError(error);
    }
  }

  @Post('favorites')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create or update a compact dictionary favorite' })
  @ApiResponse({ status: 201, description: 'Dictionary favorite saved' })
  async saveFavorite(@Body() body: DictionaryFavoriteBodyDto) {
    try {
      if (!this.favoritesService) throw new Error('Dictionary favorites service is unavailable');
      if (body.direction === DictionaryLookupDirection.AUTO) {
        throw new DictionaryDomainError(DictionaryErrorCode.INVALID_QUERY);
      }
      return await this.favoritesService.save({
        term: body.term,
        reading: body.reading ?? null,
        meaningSummary: body.meaningSummary,
        direction: body.direction,
        source: {
          provider: body.sourceProvider as 'MINHQND' | 'VI_WIKTIONARY' | 'KANJIAPI' | 'TATOEBA',
          name: body.sourceName,
          url: body.sourceUrl,
          license: body.sourceLicense ?? null,
          attribution: body.sourceAttribution,
        },
      });
    } catch (error) {
      throw this.safeMapError(error);
    }
  }

  @Get('favorites')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'List bounded authenticated dictionary favorites' })
  @ApiQuery({ name: 'limit', required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiQuery({ name: 'offset', required: false, type: Number, minimum: 0, maximum: 10000 })
  @ApiResponse({ status: 200, description: 'Compact dictionary favorite page' })
  async favorites(@Query() query: DictionaryFavoriteListQueryDto) {
    try {
      if (!this.favoritesService) throw new Error('Dictionary favorites service is unavailable');
      return await this.favoritesService.list(query.limit, query.offset);
    } catch (error) {
      throw this.safeMapError(error);
    }
  }

  @Delete('favorites/:id')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Remove an authenticated dictionary favorite' })
  @ApiResponse({ status: 200, description: 'Dictionary favorite removed' })
  async removeFavorite(@Param('id') id: string) {
    try {
      if (!this.favoritesService) throw new Error('Dictionary favorites service is unavailable');
      return await this.favoritesService.remove(id);
    } catch (error) {
      throw this.safeMapError(error);
    }
  }

  private async recordHistory(result: Awaited<ReturnType<DictionaryLookupService['lookup']>>) {
    if (!this.historyService || result.direction === DictionaryLookupDirection.AUTO) return;
    try {
      await this.historyService.record({
        query: result.query,
        direction: result.direction,
        primaryLabel: result.results[0]?.writtenForm ?? result.kanji?.character ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `dictionary_history_write_failed code=${error instanceof Error ? error.name : 'unknown'}`,
      );
    }
  }

  private safeMapError(error: unknown): HttpException {
    return toDictionaryHttpException(error);
  }
}
