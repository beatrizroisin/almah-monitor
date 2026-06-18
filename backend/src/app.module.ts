import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';


import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SyncModule } from './sync/sync.module';
import { AlertsModule } from './alerts/alerts.module';
import { HealthModule } from './health/health.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VtexModule } from './vtex/vtex.module';
import { MerchantModule } from './merchant/merchant.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SkusModule } from './skus/skus.module';
import { SeedController } from './seed.controller';

import { GlobalAuthGuard } from './common/guards/global-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    ClientsModule,
    IntegrationsModule,
    SyncModule,
    AlertsModule,
    HealthModule,
    ReportsModule,
    NotificationsModule,
    VtexModule,
    MerchantModule,
    DashboardModule,
    SkusModule,
  ],
  controllers: [SeedController],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: GlobalAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
