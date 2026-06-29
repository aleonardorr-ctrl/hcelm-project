/**
 * Archivo: app.module.ts
 * Ruta: apps/api/src/app.module.ts
 * Funcion: Modulo raiz de la API HCELM.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DataQualityModule } from './admin/data-quality/data-quality.module';
import { AnamnesisModule } from './anamnesis/anamnesis.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CertificatesModule } from './certificates/certificates.module';
import { ClinicalAlertsModule } from './clinical-alerts/clinical-alerts.module';
import { DiagnosesModule } from './diagnoses/diagnoses.module';
import { EncountersModule } from './encounters/encounters.module';
import { ElectronicBillingModule } from './electronic-billing/electronic-billing.module';
import { EstablishmentModule } from './establishment/establishment.module';
import { InstitutionModule } from './institution/institution.module';
import { LaboratoryCatalogModule } from './laboratory-catalog/laboratory-catalog.module';
import { MedicationCatalogModule } from './medication-catalog/medication-catalog.module';
import { MedicationsModule } from './medications/medications.module';
import { PatientsModule } from './patients/patients.module';
import { OrganizationModule } from './organization/organization.module';
import { PharmacySalesModule } from './pharmacy-sales/pharmacy-sales.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { PrismaModule } from './prisma/prisma.module';
import { WaitingRoomModule } from './waiting-room/waiting-room.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    PatientsModule,
    OrganizationModule,
    EncountersModule,
    ElectronicBillingModule,
    MedicationsModule,
    PrescriptionsModule,
    CertificatesModule,
    EstablishmentModule,
    AnamnesisModule,
    InstitutionModule,
    ClinicalAlertsModule,
    WaitingRoomModule,
    DataQualityModule,
    DiagnosesModule,
    LaboratoryCatalogModule,
    MedicationCatalogModule,
    PharmacySalesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
