import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('top-causes')
  getTopCauses(@Query('clientId') clientId?: string) {
    return this.service.getTopCauses({ clientId });
  }

  @Get('recent-alerts')
  getRecentAlerts(@Query('limit') limit?: string) {
    return this.service.getRecentAlerts(limit ? Number(limit) : 5);
  }
}
