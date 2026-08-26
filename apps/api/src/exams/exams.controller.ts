import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
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
import { ExamsService } from './exams.service.js';
import { CreateExamBodyDto } from './dto/create-exam.dto.js';
import { UpdateExamMetadataBodyDto } from './dto/update-exam-metadata.dto.js';
import { UpdateExamContentBodyDto } from './dto/update-exam-content.dto.js';
import { LearningService } from '../learning/learning.service.js';
import { SetFavoriteBodyDto } from '../common/dto/set-favorite.dto.js';

@ApiTags('Exams')
@ApiBearerAuth()
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly learningService: LearningService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new exam with optional initial questions' })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid question/option configuration' })
  async createExam(@Body() dto: CreateExamBodyDto) {
    return this.examsService.createExam(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List exams with search, pagination, and folder filtering' })
  @ApiQuery({ name: 'folderId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: 100 })
  @ApiQuery({ name: 'favorite', required: false, type: Boolean })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['createdAt_desc', 'updatedAt_desc', 'title_asc'],
  })
  @ApiResponse({ status: 200, description: 'List of exams' })
  async listExams(
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('favorite') favorite?: string,
  ) {
    return this.examsService.listExams({
      folderId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sort,
      favorite: favorite === 'true' ? true : favorite === 'false' ? false : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam details with questions and options' })
  @ApiResponse({ status: 200, description: 'Exam details' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async getExam(@Param('id', ParseUUIDPipe) id: string) {
    const exam = await this.examsService.getExam(id);
    await this.learningService.touchExam(id);
    return exam;
  }

  @Put(':id/favorite')
  @ApiOperation({ summary: 'Set or clear the favorite state of an exam' })
  @ApiResponse({ status: 200, description: 'Exam favorite state updated' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async setFavorite(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetFavoriteBodyDto) {
    return this.examsService.setFavorite(id, dto.favorite);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export exam as canonical Markdown with Answer Key' })
  @ApiResponse({ status: 200, description: 'Markdown file download' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async exportExam(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { filename, content } = await this.examsService.exportExamToMarkdown(id);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(content);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update exam metadata (does not increment contentVersion)' })
  @ApiResponse({ status: 200, description: 'Exam metadata updated' })
  async updateExamMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamMetadataBodyDto,
  ) {
    return this.examsService.updateExamMetadata(id, dto);
  }

  @Put(':id/content')
  @ApiOperation({
    summary: 'Update exam questions & options (atomically increments contentVersion)',
  })
  @ApiResponse({ status: 200, description: 'Exam questions updated with new version' })
  @ApiResponse({ status: 400, description: 'Invalid question format' })
  async updateExamContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExamContentBodyDto,
  ) {
    return this.examsService.updateExamContent(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete an exam' })
  @ApiResponse({ status: 200, description: 'Exam deleted' })
  async deleteExam(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.deleteExam(id);
  }

  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate an exam and its questions' })
  @ApiResponse({ status: 201, description: 'Duplicated exam created' })
  async duplicateExam(@Param('id', ParseUUIDPipe) id: string) {
    return this.examsService.duplicateExam(id);
  }
}
