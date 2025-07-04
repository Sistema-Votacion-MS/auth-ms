import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { Role } from 'generated/prisma';

export class CreateAuthDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  password: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(Role)
  role: Role;
}
