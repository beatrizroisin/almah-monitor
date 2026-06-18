import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('daily/:clientId')
  getDaily(@Param('clientId') clientId: string, @Query('date') date?: string) {
    return this.service.getDaily(clientId, date);
  }
}
