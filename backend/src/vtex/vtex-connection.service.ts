import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';

// Espelha doc 03, seção 2.2 — etapa 2 do wizard, teste de conexão.

@Injectable()
export class VtexConnectionService {
  /**
   * Chama o endpoint mais barato possível só para validar as credenciais
   * e estimar o total de SKUs ativos, sem paginar tudo.
   */
  async testConnection(vtexAccount: string, appKey: string, appToken: string) {
    const url = `https://${vtexAccount}.vtexcommercestable.com.br/api/catalog_system/pvt/sku/stockkeepingunitids`;

    try {
      const { data, headers } = await axios.get(url, {
        params: { IsActive: true, page: 1, pagesize: 1 },
        headers: {
          'X-VTEX-API-AppKey': appKey,
          'X-VTEX-API-AppToken': appToken,
          Accept: 'application/json',
        },
        timeout: 15000,
      });

      // VTEX retorna o total de registros no header 'rest-content-range'
      // (formato: "resources 0-0/12345"). Fazemos parse defensivo.
      const range = headers['rest-content-range'] as string | undefined;
      const skuCount = range ? Number(range.split('/').pop()) : Array.isArray(data) ? data.length : 0;

      return { status: 'CONNECTED', sku_count: skuCount || 0 };
    } catch (err: any) {
      const statusCode = err.response?.status;
      if (statusCode === 401 || statusCode === 403) {
        throw new BadRequestException('Credenciais inválidas — verificar AppKey e AppToken.');
      }
      if (statusCode === 429) {
        throw new BadRequestException('Rate limit VTEX — aguardar 1 minuto.');
      }
      throw new BadRequestException('Não foi possível conectar à VTEX. Verifique o account name e as credenciais.');
    }
  }
}
