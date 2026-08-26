import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateTagBodyDto } from './dto/create-tag.dto.js';
import { UpdateTagBodyDto } from './dto/update-tag.dto.js';
import { TagService } from './tag.service.js';

@ApiTags('Tags')
@ApiBearerAuth()
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @ApiOperation({ summary: 'List bounded normalized learning tags' })
  @ApiQuery({ name: 'limit', required: false, type: Number, maximum: 100 })
  listTags(@Query('limit') limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 100;
    return this.tagService.listTags(Number.isFinite(parsed) ? parsed : 100);
  }

  @Post()
  @ApiOperation({ summary: 'Create or return a normalized learning tag' })
  createTag(@Body() dto: CreateTagBodyDto) {
    return this.tagService.createTag(dto.name);
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Rename a learning tag' })
  renameTag(@Param('slug') slug: string, @Body() dto: UpdateTagBodyDto) {
    return this.tagService.renameTag(slug, dto.name);
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'Delete a learning tag and its assignments' })
  deleteTag(@Param('slug') slug: string) {
    return this.tagService.deleteTag(slug);
  }
}
