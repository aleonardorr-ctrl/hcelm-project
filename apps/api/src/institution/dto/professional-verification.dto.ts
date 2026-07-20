import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ProfessionalVerificationDto {
  @ApiProperty({
    description: 'DNI registrado del usuario autenticado',
    example: '12345678',
  })
  @IsString({ message: 'El DNI debe ser un texto' })
  @IsNotEmpty({ message: 'El DNI es obligatorio' })
  @Matches(/^\d{8}$/, {
    message: 'El DNI debe contener exactamente 8 dígitos',
  })
  dni: string;
}
