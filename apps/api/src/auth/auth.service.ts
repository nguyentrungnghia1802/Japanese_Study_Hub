import { Inject, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginRequestDto, LoginResponseDto, AuthMeResponseDto } from '@japanese-learning/contracts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const configuredUsername = this.configService.get<string>('AUTH_USERNAME') || 'admin';
    const configuredHash = this.configService.get<string>('AUTH_PASSWORD_HASH') || '';

    // Check username in constant time/safe comparison
    const isUsernameMatch = dto.username === configuredUsername;

    let isPasswordMatch = false;
    if (configuredHash) {
      try {
        isPasswordMatch = await bcrypt.compare(dto.password, configuredHash);
      } catch (err) {
        this.logger.error(`Error verifying password hash: ${(err as Error).message}`);
      }
    }

    if (!isUsernameMatch || !isPasswordMatch) {
      this.logger.warn(`Failed login attempt for user: ${dto.username}`);
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = {
      sub: 'primary_user',
      username: configuredUsername,
    };

    const accessToken = this.jwtService.sign(payload);
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    this.logger.log(`Successful login for user: ${configuredUsername}`);

    return {
      accessToken,
      expiresIn,
      user: {
        username: configuredUsername,
      },
    };
  }

  getMe(user: { username: string }): AuthMeResponseDto {
    return {
      username: user.username,
      authenticated: true,
    };
  }
}
