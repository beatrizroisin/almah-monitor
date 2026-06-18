import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

// Espelha doc 03, seção 2.3 — estratégia de coleta da VTEX Catalog API.

@Injectable()
export class VtexClient {
  private client(vtexAccount: string, appKey: string, appToken: string): AxiosInstance {
    return axios.create({
      baseURL: `https://${vtexAccount}.vtexcommercestable.com.br`,
      headers: {
        'X-VTEX-API-AppKey': appKey,
        'X-VTEX-API-AppToken': appToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
    });
  }

  /** Pagina /sku/stockkeepingunitids até retornar array vazio. PageSize=1000. */
  async listActiveSkuIds(vtexAccount: string, appKey: string, appToken: string): Promise<number[]> {
    const http = this.client(vtexAccount, appKey, appToken);
    const ids: number[] = [];
    let page = 1;
    const pageSize = 1000;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data } = await http.get('/api/catalog_system/pvt/sku/stockkeepingunitids', {
        params: { IsActive: true, page, pagesize: pageSize },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      ids.push(...data);
      if (data.length < pageSize) break;
      page += 1;
    }
    return ids;
  }

  /** Busca detalhes de SKUs em paralelo, em chunks de 20 (Promise.allSettled). */
  async getSkuDetails(vtexAccount: string, appKey: string, appToken: string, skuIds: number[]) {
    const http = this.client(vtexAccount, appKey, appToken);
    const chunkSize = 20;
    const results: any[] = [];

    for (let i = 0; i < skuIds.length; i += chunkSize) {
      const chunk = skuIds.slice(i, i + chunkSize);
      const settled = await Promise.allSettled(
        chunk.map((id) => http.get(`/api/catalog_system/pvt/sku/stockkeepingunitbyid/${id}`)),
      );
      settled.forEach((r) => {
        if (r.status === 'fulfilled') results.push(r.value.data);
      });
    }
    return results;
  }

  async getInventory(vtexAccount: string, appKey: string, appToken: string, skuId: number) {
    const http = this.client(vtexAccount, appKey, appToken);
    const { data } = await http.get(`/api/logistics/pvt/inventory/skus/${skuId}`);
    const balances = data?.balance ?? [];
    return balances.reduce((sum: number, w: any) => sum + (w.totalQuantity ?? 0), 0);
  }

  async getPrice(vtexAccount: string, appKey: string, appToken: string, skuId: number) {
    const http = this.client(vtexAccount, appKey, appToken);
    const { data } = await http.get(`/api/pricing/prices/${skuId}`);
    return data?.basePrice ?? null;
  }
}
