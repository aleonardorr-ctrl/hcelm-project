import {
  IsString,
  IsNotEmpty,
  IsDateString,
  Matches,
  Length,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({
    description: 'Tipo de documento (DNI, CE, Pasaporte)',
    example: 'DNI',
  })
  @IsString({ message: 'El tipo de documento debe ser texto' })
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  documentType: string;

  @ApiProperty({
    description: 'Número de documento (8 dígitos para DNI)',
    example: '12345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @Matches(/^[0-9]+$/, {
    message: 'El número de documento solo puede contener números',
  })
  @Length(8, 12, {
    message: 'El número de documento debe tener entre 8 y 12 dígitos',
  })
  documentNumber: string;

  @ApiProperty({
    description: 'Nombres y apellidos completos del paciente',
    example: 'Juan Pérez García',
  })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre completo del paciente es obligatorio' })
  fullName: string;

  @ApiProperty({
    description: 'Fecha de nacimiento (formato AAAA-MM-DD)',
    example: '1985-05-15',
  })
  @IsDateString(
    {},
    { message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD' },
  )
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  birthDate: string;

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

  @ApiPropertyOptional({
    description: 'Alergias del paciente',
    example: 'Penicilina, AINES',
  })
  @IsOptional()
  @IsString({ message: 'Las alergias deben ser texto' })
  allergies?: string;

  @ApiPropertyOptional({
    description: 'Antecedentes o enfermedades crónicas',
    example: 'Hipertensión arterial, diabetes mellitus tipo 2',
  })
  @IsOptional()
  @IsString({ message: 'Los antecedentes deben ser texto' })
  chronicDiseases?: string;

  @ApiPropertyOptional({
    description: 'Medicación habitual',
    example: 'Losartán 50 mg cada 24 horas',
  })
  @IsOptional()
  @IsString({ message: 'La medicación habitual debe ser texto' })
  usualMedication?: string;

  @ApiPropertyOptional({
    description: 'Observaciones importantes del paciente',
    example: 'Paciente anticoagulado. Riesgo de caída.',
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observations?: string;
}