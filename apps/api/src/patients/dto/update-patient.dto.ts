import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePatientDto {
  @ApiPropertyOptional({
    description: 'Tipo de documento',
    example: 'DNI',
  })
  @IsOptional()
  @IsString({ message: 'El tipo de documento debe ser texto' })
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Número de documento',
    example: '12345678',
  })
  @IsOptional()
  @IsString({ message: 'El número de documento debe ser texto' })
  @Matches(/^[0-9]+$/, {
    message: 'El número de documento solo puede contener números',
  })
  @Length(8, 12, {
    message: 'El número de documento debe tener entre 8 y 12 dígitos',
  })
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Nombres y apellidos completos del paciente',
    example: 'Juan Pérez García',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento',
    example: '1985-05-15',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD' },
  )
  birthDate?: string;

  @ApiPropertyOptional({
    description: 'Género del paciente',
    example: 'Masculino',
  })
  @IsOptional()
  @IsString({ message: 'El género debe ser texto' })
  gender?: string;

  @ApiPropertyOptional({
    description: 'Celular del paciente',
    example: '999888777',
  })
  @IsOptional()
  @IsString({ message: 'El celular debe ser texto' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Dirección del paciente',
    example: 'Av. Ejemplo 123',
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  address?: string;
}