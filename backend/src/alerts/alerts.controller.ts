import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private service: AlertsService) {}

  @Get()
  list(@Query('status') status?: string, @Query('severity') severity?: string, @Query('clientId') clientId?: string) {
    return this.service.list({ status, severity, clientId });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body('status') status: string, @Req() req: any) {
    if (status === 'RESOLVED') return this.service.resolve(id, req.user?.userId);
    if (status === 'IGNORED') return this.service.ignore(id);
    return this.service.resolve(id, req.user?.userId);
  }

  @Post(':id/comments')
  addComment(@Param('id') id: string, @Body('content') content: string, @Req() req: any) {
    return this.service.addComment(id, content, req.user?.userId);
  }

  @Get(':id/comments')
  listComments(@Param('id') id: string) {
    return this.service.listComments(id);
  }
}
