import { Module } from '@nestjs/common';
import { ExamFoldersController } from './exam-folders.controller.js';
import { ExamFoldersService } from './exam-folders.service.js';
import { ExamsController } from './exams.controller.js';
import { ExamsService } from './exams.service.js';

@Module({
  controllers: [ExamFoldersController, ExamsController],
  providers: [ExamFoldersService, ExamsService],
  exports: [ExamFoldersService, ExamsService],
})
export class ExamsModule {}
