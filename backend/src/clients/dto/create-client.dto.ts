import { IsString, IsOptional, IsUUID, IsIn, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsIn(['VTEX', 'Shopify', 'Magento'])
  @IsOptional()
  platform?: string = 'VTEX';

  @IsString()
  vtex_account: string;

  @IsString()
  merchant_id: string;

  @IsString()
  @IsOptional()
  store_url?: string;

  @IsUUID()
  @IsOptional()
  media_owner_id?: string;

  @IsUUID()
  @IsOptional()
  dev_owner_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
