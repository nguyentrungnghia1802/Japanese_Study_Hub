import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { getDefaultCorsOrigins } from './common/config/env.validation.js';
import { configureHttpServer } from './common/http-server-policy.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(compression({ threshold: 1024 }));

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });

  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigins = (
    process.env.CORS_ORIGINS?.trim() || getDefaultCorsOrigins(process.env.NODE_ENV)
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Japanese Learning System API')
    .setDescription('Personal Japanese self-learning platform REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  configureHttpServer(app.getHttpServer());
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
