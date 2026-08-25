import { Module } from '@nestjs/common';
import { FlashcardsController } from './flashcards.controller.js';
import { FlashcardsService } from './flashcards.service.js';

@Module({
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
  exports: [FlashcardsService],
})
export class FlashcardsModule {}
