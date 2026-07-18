import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class ValidateFefoAuthorizationDto {
  @IsUUID()
  authorizationId!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsUUID()
  medicationId!: string;

  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    { message: 'lotId debe tener formato UUID hexadecimal.' },
  )
  lotId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}