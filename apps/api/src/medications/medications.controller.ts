import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get('search')
  search(@CurrentUser() user: any, @Query('q') query: string) {
    return this.medicationsService.search(user.tenantId, query || '');
  }
}