import api from './client';

// Espelha integrations.controller.ts (documento 01_almah_backend_nestjs_v2):
// GET /integrations · GET /integrations/:clientId
// POST /integrations/google/auth-url · GET /integrations/google/callback
// POST /integrations/google/revoke/:clientId
// POST /integrations/vtex/connect · POST /integrations/vtex/test/:clientId
// PATCH /integrations/vtex/:clientId · DELETE /integrations/:id

export const integrationsService = {
  async listAll() {
    const { data } = await api.get('/integrations');
    return data;
  },

  async getByClient(clientId) {
    const { data } = await api.get(`/integrations/${clientId}`);
    return data;
  },

  // ── Google OAuth ──
  /** Etapa 3 do wizard — pede a URL de consentimento OAuth */
  async getGoogleAuthUrl(clientId) {
    const { data } = await api.post('/integrations/google/auth-url', { clientId });
    return data; // { url: 'https://accounts.google.com/o/oauth2/auth?...' }
  },

  /**
   * O callback em si é tratado pelo backend (redirect direto do Google),
   * mas o front pode usar isso para verificar status após retorno.
   */
  async checkGoogleCallbackStatus(clientId) {
    const { data } = await api.get(`/integrations/${clientId}`, { params: { type: 'GOOGLE_MERCHANT' } });
    return data;
  },

  async revokeGoogle(clientId) {
    const { data } = await api.post(`/integrations/google/revoke/${clientId}`);
    return data;
  },

  // ── VTEX ──
  /** Etapa 2 do wizard — salva e valida credenciais VTEX */
  async connectVtex(clientId, { appKey, appToken }) {
    const { data } = await api.post('/integrations/vtex/connect', {
      clientId,
      appKey,
      appToken,
    });
    return data; // { status: 'CONNECTED', sku_count: N }
  },

  /** Testa sem salvar — usado no botão "Testar conexão VTEX" */
  async testVtex(clientId, { appKey, appToken }) {
    const { data } = await api.post(`/integrations/vtex/test/${clientId}`, {
      appKey,
      appToken,
    });
    return data;
  },

  async updateVtexCredentials(clientId, { appKey, appToken }) {
    const { data } = await api.patch(`/integrations/vtex/${clientId}`, {
      appKey,
      appToken,
    });
    return data;
  },

  async remove(integrationId) {
    const { data } = await api.delete(`/integrations/${integrationId}`);
    return data;
  },
};
