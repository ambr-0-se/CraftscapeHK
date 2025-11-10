import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';

interface RegisterDto {
  email: string;
  password: string;
  username: string;
  role?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface UpdateProfileDto {
  profile: any;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDto) {
    return this.authService.register(
      body.email,
      body.password,
      body.username,
      body.role || 'user',
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get('profile')
  async getProfile(@Headers('authorization') auth: string) {
    const token = this.extractToken(auth);
    const user = await this.authService.verifyToken(token);
    return this.authService.getProfile(user.id);
  }

  @Put('profile')
  async updateProfile(
    @Headers('authorization') auth: string,
    @Body() body: UpdateProfileDto,
  ) {
    const token = this.extractToken(auth);
    const user = await this.authService.verifyToken(token);
    return this.authService.updateProfile(user.id, body.profile);
  }

  private extractToken(authHeader: string): string {
    if (!authHeader) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization format');
    }

    return parts[1];
  }
}

