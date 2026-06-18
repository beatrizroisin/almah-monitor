import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

// Espelha doc 03, seção 1.1 — fluxo OAuth 2.0 (Authorization Code,
// access_type=offline, prompt=consent para garantir refresh_token).

@Injectable()
export class GoogleOAuthService {
  private oauthClient;

  constructor(private config: ConfigService) {
    this.oauthClient = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URI'),
    );
  }

  /** Gera a URL de consentimento — etapa 3 do wizard */
  generateAuthUrl(state: string) {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/content'],
      state, // usado para identificar o clientId no callback
    });
  }

  /** Troca o code recebido no callback por tokens */
  async exchangeCode(code: string) {
    const { tokens } = await this.oauthClient.getToken(code);
    return tokens; // { access_token, refresh_token, expiry_date, ... }
  }

  /** Renova o access_token usando o refresh_token salvo */
  async refreshAccessToken(refreshToken: string) {
    this.oauthClient.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.oauthClient.refreshAccessToken();
    return credentials;
  }

  getClientWithTokens(accessToken: string, refreshToken: string) {
    const client = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URI'),
    );
    client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    return client;
  }
}
