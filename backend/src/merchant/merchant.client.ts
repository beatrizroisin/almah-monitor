import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GoogleOAuthService } from './google-oauth.service';

// Atualizado para Merchant API v1 (v1beta foi descontinuada em 28/fev/2026).
// accounts.products.list já retorna o produto processado + productStatus
// embutido, então não existe mais uma chamada separada de "productStatuses".

const BASE = 'https://merchantapi.googleapis.com';

@Injectable()
export class MerchantClient {
  constructor(private oauth: GoogleOAuthService) {}

  private async authHeader(accessToken: string) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  /** GET /products/v1/accounts/{account}/products — paginado, max 1000 */
  async getProductStatuses(accessToken: string, merchantId: string) {
    const headers = await this.authHeader(accessToken);
    const results: any[] = [];
    let pageToken: string | undefined;

    do {
      const { data } = await axios.get(`${BASE}/products/v1/accounts/${merchantId}/products`, {
        headers,
        params: { pageSize: 1000, pageToken },
        timeout: 30000,
      });
      results.push(...(data.products ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return results;
  }

  /** GET /accounts/v1/{name}/issues — problemas de conta */
  async getAccountIssues(accessToken: string, merchantId: string) {
    const headers = await this.authHeader(accessToken);
    const { data } = await axios.get(`${BASE}/accounts/v1/accounts/${merchantId}/issues`, {
      headers,
      timeout: 30000,
    });
    return data.accountIssues ?? [];
  }

  async getProductDetail(accessToken: string, merchantId: string, productId: string) {
    const headers = await this.authHeader(accessToken);
    const { data } = await axios.get(`${BASE}/products/v1/accounts/${merchantId}/products/${productId}`, {
      headers,
      timeout: 30000,
    });
    return data;
  }
}