import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateFefoAuthorizationRequestDto } from './dto/create-fefo-authorization-request.dto';
import { DecideFefoAuthorizationDto } from './dto/decide-fefo-authorization.dto';
import { ValidateFefoAuthorizationDto } from './dto/validate-fefo-authorization.dto';
import { PharmacyFefoAuthorizationService } from './pharmacy-fefo-authorization.service';

@UseGuards(JwtAuthGuard)
@Controller('pharmacy-fefo/authorizations')
export class PharmacyFefoAuthorizationController {
  constructor(
    private readonly service: PharmacyFefoAuthorizationService,
  ) {}

  @Post()
  requestAuthorization(
    @Request() req: any,
    @Body() body: CreateFefoAuthorizationRequestDto,
  ) {
    return this.service.requestAuthorization({
      tenantId: this.tenantId(req),
      userId: this.userId(req),
      data: body,
    });
  }

  @Get(':id')
  findOne(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.service.findOne({
      tenantId: this.tenantId(req),
      userId: this.userId(req),
      authorizationId: id,
    });
  }

  @Post(':id/approve')
  approve(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: DecideFefoAuthorizationDto,
  ) {
    return this.service.approve({
      tenantId: this.tenantId(req),
      userId: this.userId(req),
      role: this.role(req),
      authorizationId: id,
      data: body,
    });
  }

  @Post(':id/reject')
  reject(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: DecideFefoAuthorizationDto,
  ) {
    return this.service.reject({
      tenantId: this.tenantId(req),
      userId: this.userId(req),
      role: this.role(req),
      authorizationId: id,
      data: body,
    });
  }

  @Post('validate/token')
  validate(
    @Request() req: any,
    @Body() body: ValidateFefoAuthorizationDto,
  ) {
    return this.service.validate({
      tenantId: this.tenantId(req),
      userId: this.userId(req),
      data: body,
    });
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

  private role(req: any): string {
    return String(
      req?.user?.role ||
      req?.user?.payload?.role ||
      '',
    );
  }
}