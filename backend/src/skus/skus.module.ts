import { Module } from '@nestjs/common';
import { SkusService } from './skus.service';
import { SkusController } from './skus.controller';

@Module({
  providers: [SkusService],
  controllers: [SkusController],
})
export class SkusModule {}
