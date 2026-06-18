import { forwardRef, Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ClientsRepository } from './clients.repository';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [forwardRef(() => SyncModule)],
  providers: [ClientsService, ClientsRepository],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
