import { IsString, IsNotEmpty, IsDateString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty({ description: 'Tipo de documento (DNI, CE, Pasaporte)', example: 'DNI' })
  @IsString({ message: 'El tipo de documento debe ser texto' })
  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  documentType: string;

  @ApiProperty({ description: 'Número de documento (8 dígitos para DNI)', example: '12345678' })
  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @Matches(/^[0-9]+$/, { message: 'El número de documento solo puede contener números' })
  @Length(8, 12, { message: 'El número de documento debe tener entre 8 y 12 dígitos' })
  documentNumber: string;

  @ApiProperty({ description: 'Nombres y apellidos completos del paciente', example: 'Juan Pérez García' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre completo del paciente es obligatorio' })
  fullName: string;

  @ApiProperty({ description: 'Fecha de nacimiento (formato AAAA-MM-DD)', example: '1985-05-15' })
  @IsDateString({}, { message: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD' })
  @IsNotEmpty({ message: 'La fecha de nacimiento es obligatoria' })
  birthDate: string;
}