import { Global, Module } from '@nestjs/common';
import { TagController } from './tag.controller.js';
import { TagService } from './tag.service.js';

@Global()
@Module({
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
