import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import { CreateAuthDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly jwtService: JwtService,
    @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
  ) {
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
      // 1. Crear el registro de autenticación
      const newAuth = await this.auth_users.create({
        data: {
          email: createAuthDto.email,
          passwordHash: bcrypt.hashSync(createAuthDto.password, 10),
          role: createAuthDto.role,
        }
      });

      // 2. Crear el usuario en users-ms
      try {
        const userPayload = {
          id: newAuth.id,
          dni: createAuthDto.dni,
          first_name: createAuthDto.first_name,
          last_name: createAuthDto.last_name,
        };

        await firstValueFrom(
          this.userClient.send({ cmd: 'user_create' }, userPayload)
        );

        this.logger.log(`User created in users-ms for email: ${newAuth.email}`);
      } catch (userError) {
        await this.auth_users.delete({ where: { id: newAuth.id } });

        this.logger.error('Failed to create user in users-ms, rolling back auth creation', userError);
        throw new RpcException({
          status: 500,
          message: 'Failed to create user profile',
        });
      }

      // 3. Retornar respuesta exitosa
      const { passwordHash: __, ...rest } = newAuth;

      return {
        user: rest,
        token: this.signJWT({
          id: newAuth.id,
          email: newAuth.email,
          role: newAuth.role,
        }),
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error('Error in register method:', error);
      throw new RpcException({
        status: 400,
        message: 'Registration failed. Please try again.',
      });
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      // 1. Verificar credenciales en auth-ms
      const user = await this.auth_users.findUnique({
        where: { email },
      });

      if (!user) {
        throw new RpcException({
          status: 401,
          message: 'Invalid credentials',
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new RpcException({
          status: 401,
          message: 'Invalid credentials',
        });
      }

      // 2. Obtener datos adicionales del usuario desde users-ms
      let userData = null;
      try {
        userData = await firstValueFrom(
          this.userClient.send({ cmd: 'user_find_one' }, { id: user.id })
        );
      } catch (userError) {
        this.logger.warn('Could not fetch user data from users-ms, using auth data only');
      }

      // 3. Preparar respuesta
      const { passwordHash: __, ...authData } = user;

      let userInfo = authData;
      if (userData && typeof userData === 'object') {
        userInfo = Object.assign({}, authData, userData);
      }

      return {
        user: userInfo,
        token: this.signJWT({
          id: user.id,
          email: user.email,
          role: user.role,
        }),
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error('Error in login method:', error);
      throw new RpcException({
        status: 400,
        message: 'Login failed. Please try again.',
      });
    }
  }
}
