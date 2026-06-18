import { Module } from '@nestjs/common';
import { VtexConnectionService } from './vtex-connection.service';
import { VtexClient } from './vtex.client';

@Module({
  providers: [VtexConnectionService, VtexClient],
  exports: [VtexConnectionService, VtexClient],
})
export class VtexModule {}
