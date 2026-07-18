import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdatePharmacyFefoRulesDto } from './dto/update-pharmacy-fefo-rules.dto';
import { PharmacyFefoService } from './pharmacy-fefo.service';

@UseGuards(JwtAuthGuard)
@Controller('pharmacy-fefo')
export class PharmacyFefoController {
  constructor(
    private readonly pharmacyFefoService: PharmacyFefoService,
  ) {}

  @Get('rules')
  getRules(@Request() req: any) {
    return this.pharmacyFefoService.getRules(
      this.tenantId(req),
      this.userId(req),
    );
  }

  @Put('rules')
  saveRules(
    @Request() req: any,
    @Body() body: UpdatePharmacyFefoRulesDto,
  ) {
    return this.pharmacyFefoService.saveRules(
      this.tenantId(req),
      this.userId(req),
      body,
    );
  }

  @Post('rules/restore-defaults')
  restoreDefaults(@Request() req: any) {
    return this.pharmacyFefoService.restoreDefaults(
      this.tenantId(req),
      this.userId(req),
    );
  }

  private tenantId(req: any): string {
    const value =
      req?.user?.tenantId ||
      req?.user?.payload?.tenantId ||
      req?.tenantId;

    if (!value) {
      throw new UnauthorizedException(
        'No se encontró el tenant del usuario.',
      );
    }

    return String(value);
  }

  private userId(req: any): string {
    const value =
      req?.user?.id ||
      req?.user?.userId ||
      req?.user?.sub ||
      req?.user?.payload?.sub;

    if (!value) {
      throw new UnauthorizedException(
        'No se encontró el usuario autenticado.',
      );
    }

    return String(value);
  }
}