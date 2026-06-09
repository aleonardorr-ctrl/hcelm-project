import { IsString, IsNotEmpty, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'RUC de la clínica (11 dígitos)',
    example: '20611138777',
  })
  @IsString({ message: 'El RUC debe ser un texto' })
  @IsNotEmpty({ message: 'El RUC de la clínica es obligatorio' })
  ruc: string;

  @ApiProperty({
    description: 'Correo electrónico institucional del usuario',
    example: 'admin@amehealth.pe',
  })
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'AME2026',
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;
}