import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { CryptoService } from './crypto.service';
import { VtexModule } from '../vtex/vtex.module';
import { MerchantModule } from '../merchant/merchant.module';

@Module({
  imports: [VtexModule, MerchantModule],
  providers: [IntegrationsService, CryptoService],
  controllers: [IntegrationsController],
  exports: [IntegrationsService, CryptoService],
})
export class IntegrationsModule {}
