import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { FlashcardsModule } from './flashcards/flashcards.module.js';
import { ExamsModule } from './exams/exams.module.js';
import { AttemptsModule } from './attempts/attempts.module.js';
import { SearchModule } from './search/search.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { validateEnvironment } from './common/config/env.validation.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { CacheControlMiddleware } from './common/middleware/cache-control.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    FlashcardsModule,
    ExamsModule,
    AttemptsModule,
    SearchModule,
    ImportsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, CacheControlMiddleware).forRoutes('*');
  }
}
