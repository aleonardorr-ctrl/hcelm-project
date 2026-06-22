// Archivo: institution.controller.ts
// Ruta: apps/api/src/institution/institution.controller.ts
// Funcion: Configuracion institucional, usuarios, HCE y modulos habilitados.
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InstitutionService } from './institution.service';

@Controller('institution')
@UseGuards(JwtAuthGuard)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  getInstitution(@CurrentUser() user: any) {
    return this.institutionService.getInstitution(user.tenantId);
  }

  @Put()
  updateInstitution(@CurrentUser() user: any, @Body() updateDto: any) {
    return this.institutionService.updateInstitution(user.tenantId, updateDto);
  }

  @Get('system-modules')
  getSystemModules(@CurrentUser() user: any) {
    return this.institutionService.getSystemModules(user.tenantId);
  }

  @Put('system-modules')
  updateSystemModules(
    @CurrentUser() user: any,
    @Body() body: { modules?: Array<{ key?: string; enabled?: boolean }> },
  ) {
    return this.institutionService.updateSystemModules(user.tenantId, body);
  }

  @Get('users')
  getUsers(@CurrentUser() user: any) {
    return this.institutionService.getUsers(user.tenantId);
  }

  @Post('users')
  createUser(@CurrentUser() user: any, @Body() createUserDto: any) {
    return this.institutionService.createUser(user.tenantId, createUserDto);
  }

  @Patch('users/:userId/toggle')
  toggleUser(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() toggleDto: { active: boolean },
  ) {
    return this.institutionService.toggleUser(
      user.tenantId,
      userId,
      toggleDto.active,
    );
  }

  @Get('hce-config')
  getHceConfig(@CurrentUser() user: any) {
    return this.institutionService.getHceConfig(user.tenantId);
  }

  @Put('hce-config')
  updateHceConfig(@CurrentUser() user: any, @Body() configDto: any) {
    return this.institutionService.updateHceConfig(user.tenantId, configDto);
  }
}
