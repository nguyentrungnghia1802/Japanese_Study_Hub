import { Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module.js';
import { ExamReviewController } from './exam-review.controller.js';
import { ExamReviewService } from './exam-review.service.js';

@Module({
  imports: [AttemptsModule],
  controllers: [ExamReviewController],
  providers: [ExamReviewService],
  exports: [ExamReviewService],
})
export class ExamReviewModule {}
