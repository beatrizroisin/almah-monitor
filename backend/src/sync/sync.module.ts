import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncScheduler } from './sync.scheduler';
import { SnapshotService } from './snapshot.service';
import { DiffService } from './diff.service';
import { AlertRulesService } from './alert-rules.service';
import { VtexModule } from '../vtex/vtex.module';
import { MerchantModule } from '../merchant/merchant.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { HealthModule } from '../health/health.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [VtexModule, MerchantModule, IntegrationsModule, HealthModule, NotificationsModule],
  providers: [SyncService, SyncScheduler, SnapshotService, DiffService, AlertRulesService],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
