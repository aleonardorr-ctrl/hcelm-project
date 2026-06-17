import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { MedicationsModule } from './medications/medications.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { CertificatesModule } from './certificates/certificates.module';
import { EstablishmentModule } from './establishment/establishment.module';
import { AnamnesisModule } from './anamnesis/anamnesis.module';
import { InstitutionModule } from './institution/institution.module';
import { EncountersModule } from './encounters/encounters.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    PatientsModule,
    EncountersModule,

    MedicationsModule,
    PrescriptionsModule,
    CertificatesModule,

    EstablishmentModule,
    AnamnesisModule,
    InstitutionModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}