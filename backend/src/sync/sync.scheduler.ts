import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncService } from './sync.service';

@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(private syncService: SyncService) {}

  // 0 9 * * * UTC = 06h BRT (UTC-3) — ver SYNC_CRON_UTC no .env
  @Cron('0 9 * * *')
  async handleDailySync() {
    this.logger.log('Iniciando sync diário agendado para todos os clientes ativos...');
    await this.syncService.syncAllActiveClients();
    this.logger.log('Sync diário agendado concluído.');
  }
}
