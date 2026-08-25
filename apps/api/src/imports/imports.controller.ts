import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ImportsService } from './imports.service.js';
import { PreviewFlashcardsBodyDto } from './dto/preview-flashcards.dto.js';
import { ConfirmFlashcardsBodyDto } from './dto/confirm-flashcards.dto.js';

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('flashcards/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview flashcard markdown import without writing domain records' })
  @ApiResponse({
    status: 200,
    description: 'Flashcard import preview with token and error summary',
  })
  @ApiResponse({ status: 400, description: 'Invalid or empty content' })
  async previewFlashcards(@Body() dto: PreviewFlashcardsBodyDto) {
    return this.importsService.previewFlashcards(dto.content);
  }

  @Post('flashcards/confirm')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Confirm and commit a flashcard import session' })
  @ApiResponse({ status: 201, description: 'Flashcard set and cards created successfully' })
  @ApiResponse({ status: 400, description: 'Session expired, invalid or has blocking errors' })
  @ApiResponse({ status: 409, description: 'Conflict on duplicate title with REJECT policy' })
  async confirmFlashcards(@Body() dto: ConfirmFlashcardsBodyDto) {
    return this.importsService.confirmFlashcards(dto);
  }
}
