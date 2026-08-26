import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Check API and system health' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'japanese-study-hub-api',
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Check API readiness including database connectivity' })
  @ApiResponse({ status: 200, description: 'API and database are ready' })
  @ApiResponse({ status: 503, description: 'Database is unavailable' })
  async ready() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'japanese-study-hub-api',
        database: 'ok',
      };
    } catch {
      throw new ServiceUnavailableException('Database is not ready');
    }
  }
}
