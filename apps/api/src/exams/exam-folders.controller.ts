import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ExamFoldersService } from './exam-folders.service.js';
import { CreateFolderBodyDto } from './dto/create-folder.dto.js';
import { UpdateFolderBodyDto } from './dto/update-folder.dto.js';

@ApiTags('Exam Folders')
@ApiBearerAuth()
@Controller('exam-folders')
export class ExamFoldersController {
  constructor(private readonly foldersService: ExamFoldersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an exam folder (max depth 2)' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  @ApiResponse({ status: 400, description: 'Exceeds maximum depth of 2' })
  async createFolder(@Body() dto: CreateFolderBodyDto) {
    return this.foldersService.createFolder(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List hierarchical exam folders tree' })
  @ApiResponse({ status: 200, description: 'Hierarchical folder list' })
  async listFolders() {
    return this.foldersService.listFolders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder details by ID' })
  @ApiResponse({ status: 200, description: 'Folder details' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async getFolder(@Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.getFolder(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update folder name, parent, or position' })
  @ApiResponse({ status: 200, description: 'Folder updated successfully' })
  @ApiResponse({ status: 400, description: 'Cycle detected or exceeds depth 2' })
  async updateFolder(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFolderBodyDto) {
    return this.foldersService.updateFolder(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete folder and its descendants' })
  @ApiResponse({ status: 200, description: 'Folder deleted' })
  async deleteFolder(@Param('id', ParseUUIDPipe) id: string) {
    return this.foldersService.deleteFolder(id);
  }
}
