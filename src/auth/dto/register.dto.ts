import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, Matches, Length } from 'class-validator';
import { RoleEnum } from './role.dto';

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
  @IsEnum(RoleEnum)
  role: RoleEnum;

  @Length(8, 8)
  @IsNotEmpty()
  @Matches(/^[0-9]+$/, {
    message: 'DNI must be a number with 8 digits',
  })
  dni: string;

  @IsNotEmpty()
  @IsString()
  first_name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;
}
