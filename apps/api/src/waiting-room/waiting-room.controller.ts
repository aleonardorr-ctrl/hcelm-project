import { Controller, Get, UseGuards } from '@nestjs/common';
import { WaitingRoomService } from './waiting-room.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('waiting-room')
export class WaitingRoomController {
  constructor(private readonly waitingRoomService: WaitingRoomService) {}

  @Get('today')
  getTodayWaitingRoom(@CurrentUser() user: any) {
    return this.waitingRoomService.getTodayWaitingRoom(user.tenantId);
  }
}