import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private service: SyncService) {}

  @Post(':clientId/now')
  triggerNow(@Param('clientId') clientId: string, @Req() req: any) {
    return this.service.syncClient(clientId, 'MANUAL', req.user?.userId);
  }

  @Get(':clientId/logs')
  getLogs(@Param('clientId') clientId: string) {
    return this.service.getLogs(clientId);
  }
}
