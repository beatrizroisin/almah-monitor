import { Module } from '@nestjs/common';
import { GoogleOAuthService } from './google-oauth.service';
import { MerchantClient } from './merchant.client';

@Module({
  providers: [GoogleOAuthService, MerchantClient],
  exports: [GoogleOAuthService, MerchantClient],
})
export class MerchantModule {}
