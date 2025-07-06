import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateAuthDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @MessagePattern({ cmd: 'auth_registe' })
  register(@Payload() registerDto: CreateAuthDto) {
    console.log('Registering user:', registerDto);
    return this.authService.register(registerDto);
  }

  @MessagePattern({ cmd: 'auth_login' })
  login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
