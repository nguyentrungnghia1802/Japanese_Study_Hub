import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginBodyDto } from './dto/login.dto.js';
import { Public } from './public.decorator.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with credentials' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid username or password' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() dto: LoginBodyDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out of current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout() {
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Authenticated user info' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async getMe(@Req() req: Request & { user?: { username: string } }) {
    return this.authService.getMe(req.user || { username: 'admin' });
  }
}
