import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsUUID,
  MinLength,
} from 'class-validator';
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
    description: 'Contrasena privada del usuario',
    format: 'password',
    writeOnly: true,
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @ApiProperty({
    description: 'Unidad de negocio activa seleccionada para la sesión',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'La unidad de negocio seleccionada no es válida' })
  businessUnitId?: string;
}
