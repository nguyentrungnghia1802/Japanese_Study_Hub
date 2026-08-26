import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { FlashcardsService } from './flashcards.service.js';
import { CreateSetBodyDto } from './dto/create-set.dto.js';
import { UpdateSetBodyDto } from './dto/update-set.dto.js';
import { CreateCardBodyDto } from './dto/create-card.dto.js';
import { UpdateCardBodyDto } from './dto/update-card.dto.js';
import { ReorderCardsBodyDto } from './dto/reorder-cards.dto.js';
import { LearningService } from '../learning/learning.service.js';
import { SetFavoriteBodyDto } from '../common/dto/set-favorite.dto.js';

@ApiTags('Flashcards')
@ApiBearerAuth()
@Controller('flashcard-sets')
export class FlashcardsController {
  constructor(
    private readonly flashcardsService: FlashcardsService,
    private readonly learningService: LearningService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new flashcard set' })
  @ApiResponse({ status: 201, description: 'Flashcard set created successfully' })
  async createSet(@Body() dto: CreateSetBodyDto) {
    return this.flashcardsService.createSet(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all flashcard sets with pagination & search' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: 100 })
  @ApiQuery({ name: 'favorite', required: false, type: Boolean })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['createdAt_desc', 'updatedAt_desc', 'title_asc'],
  })
  @ApiResponse({ status: 200, description: 'List of flashcard sets' })
  async listSets(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('favorite') favorite?: string,
  ) {
    return this.flashcardsService.listSets({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sort,
      favorite: favorite === 'true' ? true : favorite === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flashcard set with all its cards' })
  @ApiResponse({ status: 200, description: 'Flashcard set details with cards' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async getSet(@Param('id', ParseUUIDPipe) id: string) {
    const set = await this.flashcardsService.getSet(id);
    await this.learningService.touchFlashcardSet(id);
    return set;
  }

  @Put(':id/favorite')
  @ApiOperation({ summary: 'Set or clear the favorite state of a flashcard set' })
  @ApiResponse({ status: 200, description: 'Flashcard set favorite state updated' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async setFavorite(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetFavoriteBodyDto) {
    return this.flashcardsService.setFavorite(id, dto.favorite);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export a flashcard set as canonical Markdown' })
  @ApiResponse({ status: 200, description: 'Markdown file download' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async exportSet(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { filename, content } = await this.flashcardsService.exportSetToMarkdown(id);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(content);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update flashcard set metadata' })
  @ApiResponse({ status: 200, description: 'Flashcard set updated' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async updateSet(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSetBodyDto) {
    return this.flashcardsService.updateSet(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a flashcard set and its cards' })
  @ApiResponse({ status: 200, description: 'Flashcard set deleted' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async deleteSet(@Param('id', ParseUUIDPipe) id: string) {
    return this.flashcardsService.deleteSet(id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate a flashcard set and all its cards' })
  @ApiResponse({ status: 201, description: 'Flashcard set duplicated' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async duplicateSet(@Param('id', ParseUUIDPipe) id: string) {
    return this.flashcardsService.duplicateSet(id);
  }

  // Cards Endpoints
  @Post(':setId/cards')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a flashcard to a set' })
  @ApiResponse({ status: 201, description: 'Flashcard created' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async createCard(@Param('setId', ParseUUIDPipe) setId: string, @Body() dto: CreateCardBodyDto) {
    return this.flashcardsService.createCard(setId, dto);
  }

  @Post(':setId/cards/:cardId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate a card in the set' })
  @ApiResponse({ status: 201, description: 'Flashcard duplicated' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async duplicateCard(
    @Param('setId', ParseUUIDPipe) setId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.flashcardsService.duplicateCard(setId, cardId);
  }

  @Patch(':setId/cards/:cardId')
  @ApiOperation({ summary: 'Update a flashcard' })
  @ApiResponse({ status: 200, description: 'Flashcard updated' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async updateCard(
    @Param('setId', ParseUUIDPipe) setId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() dto: UpdateCardBodyDto,
  ) {
    return this.flashcardsService.updateCard(setId, cardId, dto);
  }

  @Delete(':setId/cards/:cardId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a flashcard' })
  @ApiResponse({ status: 200, description: 'Flashcard deleted' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async deleteCard(
    @Param('setId', ParseUUIDPipe) setId: string,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.flashcardsService.deleteCard(setId, cardId);
  }

  @Put(':setId/cards/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder cards in a flashcard set' })
  @ApiResponse({ status: 200, description: 'Cards reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid card IDs' })
  @ApiResponse({ status: 404, description: 'Set not found' })
  async reorderCards(
    @Param('setId', ParseUUIDPipe) setId: string,
    @Body() dto: ReorderCardsBodyDto,
  ) {
    return this.flashcardsService.reorderCards(setId, dto);
  }
}
