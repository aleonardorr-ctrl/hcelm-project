import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { CommercialCustomerType, IdentityDocumentType } from '@prisma/client';

export class UpsertCommercialCustomerDto {
  @IsEnum(CommercialCustomerType)
  customerType!: CommercialCustomerType;

  @IsEnum(IdentityDocumentType)
  documentType!: IdentityDocumentType;

  @IsString()
  @MaxLength(20)
  documentNumber!: string;

  @IsString()
  @MaxLength(200)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstNames?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paternalSurname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  maternalSurname?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  telegramChatId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

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
  @IsBoolean()
  electronicDeliveryConsent?: boolean;
}
