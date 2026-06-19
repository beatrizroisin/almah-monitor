import { IsString, IsOptional, IsIn, MinLength } from 'class-validator';

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

  @IsString()
  @IsOptional()
  media_owner_id?: string;

  @IsString()
  @IsOptional()
  dev_owner_id?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}