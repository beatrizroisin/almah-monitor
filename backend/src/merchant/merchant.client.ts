import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GoogleOAuthService } from './google-oauth.service';

// Espelha doc 03, seção 1.2 — Merchant API v1beta.
// ATENÇÃO: Content API será descontinuada em agosto de 2026 — usar
// obrigatoriamente https://merchantapi.googleapis.com/{service}/v1beta/{resource}

const BASE = 'https://merchantapi.googleapis.com';

@Injectable()
export class MerchantClient {
  constructor(private oauth: GoogleOAuthService) {}

  private async authHeader(accessToken: string) {
    return { Authorization: `Bearer ${accessToken}` };
  }

  /** GET /products/v1beta/{parent}/productStatuses — paginado, max 250 */
  async getProductStatuses(accessToken: string, merchantId: string) {
    const headers = await this.authHeader(accessToken);
    const results: any[] = [];
    let pageToken: string | undefined;

    do {
      const { data } = await axios.get(`${BASE}/products/v1beta/accounts/${merchantId}/productStatuses`, {
        headers,
        params: { pageSize: 250, pageToken },
        timeout: 30000,
      });
      results.push(...(data.productStatuses ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return results;
  }

  /** GET /accounts/v1beta/{name}/issues — problemas de conta, checar diariamente */
  async getAccountIssues(accessToken: string, merchantId: string) {
    const headers = await this.authHeader(accessToken);
    const { data } = await axios.get(`${BASE}/accounts/v1beta/accounts/${merchantId}/issues`, {
      headers,
      timeout: 30000,
    });
    return data.accountIssues ?? [];
  }

  async getProductDetail(accessToken: string, merchantId: string, productId: string) {
    const headers = await this.authHeader(accessToken);
    const { data } = await axios.get(`${BASE}/products/v1beta/accounts/${merchantId}/products/${productId}`, {
      headers,
      timeout: 30000,
    });
    return data;
  }
}
