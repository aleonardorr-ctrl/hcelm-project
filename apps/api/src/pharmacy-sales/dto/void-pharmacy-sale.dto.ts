import { IsString, Length } from 'class-validator';

export class VoidPharmacySaleDto {
  @IsString()
  @Length(8, 100)
  idempotencyKey!: string;

  @IsString()
  @Length(5, 500)
  reason!: string;
}
