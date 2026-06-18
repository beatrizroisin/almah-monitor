import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get()
  findAll(@Query('search') search?: string, @Query('status') status?: string, @Query('page') page?: string) {
    return this.service.findAll({ search, status, page: page ? Number(page) : undefined });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/integrations')
  getIntegrations(@Param('id') id: string) {
    return this.service.getIntegrations(id);
  }

  @Get(':id/dashboard')
  getDashboard(@Param('id') id: string) {
    return this.service.getDashboard(id);
  }

  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.service.getSummary(id);
  }

  @Post(':id/sync')
  triggerSync(@Param('id') id: string) {
    return this.service.triggerSync(id);
  }
}
