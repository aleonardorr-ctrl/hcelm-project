import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PlatformLoginDto } from './dto/platform-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authService.login(body.ruc, body.email, body.password);
  }

  @Post('platform-login')
  @HttpCode(HttpStatus.OK)
  platformLogin(@Body() body: PlatformLoginDto) {
    return this.authService.platformLogin(body.email, body.password);
  }
}
