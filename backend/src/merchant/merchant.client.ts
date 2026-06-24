import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { GoogleOAuthService } from './google-oauth.service';

// Atualizado para Merchant API v1 (v1beta foi descontinuada em 28/fev/2026).

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

  /**
   * Reports API (accounts.reports.search) — fonte oficial de status agregado
   * por produto. Mais confiável que cruzar products.list manualmente, porque
   * aggregated_reporting_context_status já reflete exatamente o que o
   * Merchant Center mostra no painel (Aprovados/Limitados/Reprovados/Em revisão).
   *
   * Valores possíveis de aggregated_reporting_context_status:
   * ELIGIBLE | ELIGIBLE_LIMITED | NOT_ELIGIBLE_OR_DISAPPROVED | PENDING
   */
  async getProductView(accessToken: string, merchantId: string) {
    const headers = await this.authHeader(accessToken);
    const results: any[] = [];
    let pageToken: string | undefined;

    const query =
      'SELECT offer_id, id, title, aggregated_reporting_context_status, item_issues FROM product_view';

    do {
      const { data } = await axios.post(
        `${BASE}/reports/v1/accounts/${merchantId}/reports:search`,
        { query, pageSize: 1000, pageToken },
        { headers, timeout: 30000 },
      );
      results.push(...(data.results ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return results.map((r) => r.productView);
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

  /** DEBUG temporário — retorna os primeiros N produtos crus, sem nenhum mapeamento */
  async debugRawProducts(accessToken: string, merchantId: string, pageSize = 5) {
    const headers = await this.authHeader(accessToken);
    const { data } = await axios.get(`${BASE}/products/v1/accounts/${merchantId}/products`, {
      headers,
      params: { pageSize },
      timeout: 30000,
    });
    return data;
  }

  async registerGcp(accessToken: string, merchantId: string, developerEmail: string) {
    const headers = await this.authHeader(accessToken);
    const { data } = await axios.post(
      `${BASE}/accounts/v1/accounts/${merchantId}/developerRegistration:registerGcp`,
      { developerEmail },
      { headers, timeout: 30000 },
    );
    return data;
  }

  async debugRawProductView(accessToken: string, merchantId: string, pageSize = 50) {
    const headers = await this.authHeader(accessToken);
    const query =
      'SELECT offer_id, id, title, aggregated_reporting_context_status, item_issues FROM product_view';
    const { data } = await axios.post(
      `${BASE}/reports/v1/accounts/${merchantId}/reports:search`,
      { query, pageSize },
      { headers, timeout: 30000 },
    );
    return data;
  }
}
