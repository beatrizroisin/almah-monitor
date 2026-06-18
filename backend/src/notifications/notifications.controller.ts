import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get('notifications/config')
  getGlobalConfig() {
    return this.service.getGlobalConfig();
  }

  @Patch('notifications/config')
  updateGlobalConfig(@Body() body: any) {
    return this.service.updateGlobalConfig(body);
  }

  @Get('clients/:clientId/notifications')
  getClientConfig(@Param('clientId') clientId: string) {
    return this.service.getClientConfig(clientId);
  }

  @Patch('clients/:clientId/notifications')
  updateClientConfig(@Param('clientId') clientId: string, @Body() body: any) {
    return this.service.updateClientConfig(clientId, body);
  }
}
