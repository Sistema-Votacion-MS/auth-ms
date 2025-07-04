import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import { CreateAuthDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService');

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  signJWT(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async register(createAuthDto: CreateAuthDto) {
    try {
      const newUser = await this.auth_users.create({
        data: {
          email: createAuthDto.email,
          passwordHash: bcrypt.hashSync(createAuthDto.password, 10),
          role: createAuthDto.role,
        }
      })

      const { passwordHash: __, ...rest } = newUser;

      return {
        user: rest,
        token: this.signJWT(rest),
      };
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      const user = await this.auth_users.findUnique({
        where: { email },
      });

      if (!user) {
        throw new RpcException({
          status: 400,
          message: 'User/Password not valid',
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new RpcException({
          status: 400,
          message: 'User/Password not valid',
        });
      }

      const { passwordHash: __, ...rest } = user;

      return {
        user: rest,
        token: this.signJWT(rest),
      };
    } catch (error) {
      throw new RpcException({
        status: 400,
        message: error.message,
      });
    }
  }
}
