import { Controller, Get, Put, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('institution')
@UseGuards(JwtAuthGuard)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  async getInstitution(@CurrentUser() user: any) {
    return this.institutionService.getInstitution(user.tenantId);
  }

  @Put()
  async updateInstitution(@CurrentUser() user: any, @Body() updateDto: any) {
    return this.institutionService.updateInstitution(user.tenantId, updateDto);
  }

  @Get('users')
  async getUsers(@CurrentUser() user: any) {
    return this.institutionService.getUsers(user.tenantId);
  }

  @Post('users')
  async createUser(@CurrentUser() user: any, @Body() createUserDto: any) {
    return this.institutionService.createUser(user.tenantId, createUserDto);
  }

  @Patch('users/:userId/toggle')
  async toggleUser(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() toggleDto: { active: boolean },
  ) {
    return this.institutionService.toggleUser(user.tenantId, userId, toggleDto.active);
  }

  @Get('hce-config')
  async getHceConfig(@CurrentUser() user: any) {
    return this.institutionService.getHceConfig(user.tenantId);
  }

  @Put('hce-config')
  async updateHceConfig(@CurrentUser() user: any, @Body() configDto: any) {
    return this.institutionService.updateHceConfig(user.tenantId, configDto);
  }
}