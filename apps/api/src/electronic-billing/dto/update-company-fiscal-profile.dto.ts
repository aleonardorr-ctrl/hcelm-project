import {
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  ElectronicBillingEnvironment,
  ElectronicBillingProvider,
} from '@prisma/client';

export class UpdateCompanyFiscalProfileDto {
  @IsString()
  @Length(3, 255)
  fiscalAddress!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  ubigeo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @IsOptional()
  @IsEnum(ElectronicBillingProvider)
  provider?: ElectronicBillingProvider;

  @IsOptional()
  @IsEnum(ElectronicBillingEnvironment)
  environment?: ElectronicBillingEnvironment;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  credentialSecretRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificateSecretRef?: string;

  @IsOptional()
  @IsISO8601()
  certificateExpiresAt?: string;

  @IsOptional()
  @IsObject()
  nonSecretSettings?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
