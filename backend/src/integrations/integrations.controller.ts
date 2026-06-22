import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { IntegrationsService } from './integrations.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private service: IntegrationsService,
    private config: ConfigService,
  ) {}

  @Get()
  listAll() {
    return this.service.listAll();
  }

  @Get(':clientId')
  getByClient(@Param('clientId') clientId: string) {
    return this.service.getByClient(clientId);
  }

  // ── VTEX ──
  @Post('vtex/connect')
  connectVtex(@Body() body: { clientId: string; appKey: string; appToken: string }) {
    return this.service.connectVtex(body.clientId, body.appKey, body.appToken);
  }

  @Post('vtex/test/:clientId')
  testVtex(@Param('clientId') clientId: string, @Body() body: { appKey: string; appToken: string }) {
    return this.service.testVtex(clientId, body.appKey, body.appToken);
  }

  @Patch('vtex/:clientId')
  updateVtex(@Param('clientId') clientId: string, @Body() body: { appKey: string; appToken: string }) {
    return this.service.updateVtexCredentials(clientId, body.appKey, body.appToken);
  }

  // ── Google OAuth ──
  @Post('google/auth-url')
  getGoogleAuthUrl(@Body() body: { clientId: string }) {
    return this.service.getGoogleAuthUrl(body.clientId);
  }

  @Post('google/register-gcp/:clientId')
  registerGcp(@Param('clientId') clientId: string, @Body() body: { developerEmail: string }) {
    return this.service.registerGcpForClient(clientId, body.developerEmail);
  }

  /**
   * Callback público — o Google redireciona o navegador do usuário
   * diretamente para esta rota (não passa pelo JwtAuthGuard).
   */
  @Public()
  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') clientId: string, @Res() res: Response) {
    const frontendUrl = this.config.get('APP_FRONTEND_URL');
    try {
      await this.service.handleGoogleCallback(code, clientId);
      // Fecha o popup e deixa o frontend confirmar via polling/checkGoogleStatus
      res.send('<script>window.close()</script>Autorização concluída. Você pode fechar esta janela.');
    } catch (err) {
      res.status(400).send(`Erro na autorização: ${err.message}`);
    }
  }

  @Post('google/revoke/:clientId')
  revokeGoogle(@Param('clientId') clientId: string) {
    return this.service.revokeGoogle(clientId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
