import { Inject, Injectable, Logger, OnModuleInit, HttpStatus } from '@nestjs/common';
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
    this.logger.log(`[register] Starting registration process for email: ${createAuthDto.email}`);

    try {
      // 1. Crear el registro de autenticación
      this.logger.debug(`[register] Creating auth record with role: ${createAuthDto.role}`);
      const newAuth = await this.auth_users.create({
        data: {
          email: createAuthDto.email,
          passwordHash: bcrypt.hashSync(createAuthDto.password, 10),
          role: createAuthDto.role as any, // Cast to any or explicitly map to $Enums.Role if possible
        }
      });
      this.logger.log(`[register] Auth record created successfully with ID: ${newAuth.id}`);

      // 2. Crear el usuario en users-ms
      try {
        const userPayload = {
          id: newAuth.id,
          dni: createAuthDto.dni,
          first_name: createAuthDto.first_name,
          last_name: createAuthDto.last_name,
        };

        this.logger.log(`[register] Sending user profile creation request to users-ms`);
        await firstValueFrom(
          this.userClient.send({ cmd: 'user_create' }, userPayload)
        );

        this.logger.log(`[register] User profile created successfully in users-ms for email: ${newAuth.email}`);
      } catch (userError) {
        this.logger.error(`[register] Failed to create user in users-ms, rolling back auth creation`, userError);

        this.logger.debug(`[register] Deleting auth record with ID: ${newAuth.id}`);
        await this.auth_users.delete({ where: { id: newAuth.id } });
        this.logger.log(`[register] Auth record rollback completed`);

        throw new RpcException({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to create user profile',
          error: 'User Profile Creation Failed'
        });
      }

      // 3. Retornar respuesta exitosa
      const { passwordHash: __, ...rest } = newAuth;

      this.logger.log(`[register] Registration completed successfully for user: ${newAuth.id}`);
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

      this.logger.error(`[register] Registration failed for email ${createAuthDto.email}:`, error);
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Registration failed. Please check if the email is already in use and verify all required fields are provided.',
        error: 'Registration Failed'
      });
    }
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`[login] Starting login process for email: ${loginDto.email}`);

    try {
      const { email, password } = loginDto;

      // 1. Verificar credenciales en auth-ms
      this.logger.debug(`[login] Searching for user with email: ${email}`);
      const user = await this.auth_users.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.warn(`[login] Login attempt failed - User not found for email: ${email}`);
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'Invalid credentials',
          error: 'Authentication Failed'
        });
      }

      this.logger.debug(`[login] User found, verifying password for user ID: ${user.id}`);
      const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);

      if (!isPasswordValid) {
        this.logger.warn(`[login] Login attempt failed - Invalid password for email: ${email}`);
        throw new RpcException({
          status: HttpStatus.UNAUTHORIZED,
          message: 'Invalid credentials',
          error: 'Authentication Failed'
        });
      }

      this.logger.log(`[login] Credentials validated successfully for user: ${user.id}`);

      // 2. Obtener datos adicionales del usuario desde users-ms
      let userData = null;
      try {
        this.logger.debug(`[login] Fetching additional user data from users-ms for user: ${user.id}`);
        userData = await firstValueFrom(
          this.userClient.send({ cmd: 'user_find_one' }, { id: user.id })
        );
        this.logger.log(`[login] Additional user data retrieved successfully from users-ms`);
      } catch (userError) {
        this.logger.warn(`[login] Could not fetch user data from users-ms for user ${user.id}, using auth data only`, userError);
      }

      // 3. Preparar respuesta
      const { passwordHash: __, ...authData } = user;

      let userInfo = authData;
      if (userData && typeof userData === 'object') {
        this.logger.debug(`[login] Merging auth and user data for comprehensive response`);
        userInfo = Object.assign({}, authData, userData);
      }

      this.logger.log(`[login] Login completed successfully for user: ${user.id}`);
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

      this.logger.error(`[login] Login failed for email ${loginDto.email}:`, error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Login failed due to a server error. Please try again later.',
        error: 'Authentication Error'
      });
    }
  }
}
