import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdentityLookupService } from './identity-lookup.service';

@Controller('identity-lookup')
@UseGuards(JwtAuthGuard)
export class IdentityLookupController {
  constructor(private readonly service: IdentityLookupService) {}

  @Post('verify')
  verify(@Body() body: any) {
    return this.service.verify({
      documentType: body?.documentType,
      documentNumber: body?.documentNumber,
      name: body?.name,
    });
  }
}
