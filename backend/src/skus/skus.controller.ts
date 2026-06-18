import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SkusService } from './skus.service';

@Controller()
export class SkusController {
  constructor(private service: SkusService) {}

  @Get('skus/problematic')
  listProblematic(@Query('clientId') clientId?: string, @Query('issueType') issueType?: string) {
    return this.service.listProblematic({ clientId, issueType });
  }

  @Get('clients/:clientId/skus/missing')
  listMissing(@Param('clientId') clientId: string) {
    return this.service.listMissing(clientId);
  }

  @Post('skus/:id/reprocess')
  reprocess(@Param('id') id: string) {
    return this.service.reprocess(id);
  }

  @Post('clients/:clientId/sku-priorities')
  setPriority(
    @Param('clientId') clientId: string,
    @Body() body: { skuId: string; priorityReason: string; notes?: string },
  ) {
    return this.service.setPriority(clientId, body.skuId, body.priorityReason, body.notes);
  }

  @Get('skus/export')
  async exportCsv(@Query('clientId') clientId: string, @Res() res: Response) {
    const csv = await this.service.exportCsvRows({ clientId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="skus-problematicos.csv"');
    res.send(csv);
  }
}
