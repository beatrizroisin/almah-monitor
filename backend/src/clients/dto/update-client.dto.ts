import { PartialType } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @IsString()
  @IsIn(['PENDING', 'ACTIVE', 'INACTIVE', 'ERROR'])
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  notifications?: Record<string, any>;
}
