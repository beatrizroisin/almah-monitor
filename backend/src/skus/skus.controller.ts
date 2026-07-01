import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { SkusService } from './skus.service';

@Controller()
export class SkusController {
  constructor(private service: SkusService) {}

  @Get('skus/problematic')
  listProblematic(
    @Query('clientId') clientId?: string,
    @Query('issueType') issueType?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listProblematic({ clientId, issueType, status });
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
  async exportXlsx(@Query('clientId') clientId: string, @Query('status') status: string, @Res() res: Response) {
    const buffer = await this.service.exportXlsxBuffer({ clientId, status });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="skus-problematicos.xlsx"');
    res.send(Buffer.from(buffer));
  }
}
