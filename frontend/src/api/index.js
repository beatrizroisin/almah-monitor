import api from './client';

// ── Alertas ──────────────────────────────────────────────
export const alertsService = {
  async list(params = {}) {
    // params: { status: 'OPEN'|'RESOLVED'|'IGNORED', severity, clientId, page }
    const { data } = await api.get('/alerts', { params });
    return data;
  },

  async resolve(alertId) {
    const { data } = await api.patch(`/alerts/${alertId}`, { status: 'RESOLVED' });
    return data;
  },

  async ignore(alertId) {
    const { data } = await api.patch(`/alerts/${alertId}`, { status: 'IGNORED' });
    return data;
  },

  async addComment(alertId, content) {
    const { data } = await api.post(`/alerts/${alertId}/comments`, { content });
    return data;
  },

  async listComments(alertId) {
    const { data } = await api.get(`/alerts/${alertId}/comments`);
    return data;
  },
};

// ── SKUs problemáticos ───────────────────────────────────
export const skusService = {
  /** params: { clientId, issueType, severity, page, pageSize } */
  async listProblematic(params = {}) {
    const { data } = await api.get('/skus/problematic', { params });
    return data;
  },

  async listMissing(clientId, params = {}) {
    const { data } = await api.get(`/clients/${clientId}/skus/missing`, { params });
    return data;
  },

  async reprocess(skuId) {
    const { data } = await api.post(`/skus/${skuId}/reprocess`);
    return data;
  },

  async exportCsv(params = {}) {
    const { data } = await api.get('/skus/export', {
      params,
      responseType: 'blob',
    });
    return data;
  },

  /** Marca/desmarca um SKU como prioritário (client_sku_priorities) */
  async setPriority(clientId, skuId, priorityReason, notes) {
    const { data } = await api.post(`/clients/${clientId}/sku-priorities`, {
      skuId,
      priorityReason,
      notes,
    });
    return data;
  },
};

// ── Dashboard geral (visão Almah) ────────────────────────
export const dashboardService = {
  async getOverview() {
    const { data } = await api.get('/dashboard/overview');
    return data;
  },

  async getTopCauses(params = {}) {
    const { data } = await api.get('/dashboard/top-causes', { params });
    return data;
  },

  async getRecentAlerts(limit = 5) {
    const { data } = await api.get('/dashboard/recent-alerts', { params: { limit } });
    return data;
  },
};

// ── Notificações ─────────────────────────────────────────
export const notificationsService = {
  async getGlobalConfig() {
    const { data } = await api.get('/notifications/config');
    return data;
  },

  async updateGlobalConfig(payload) {
    const { data } = await api.patch('/notifications/config', payload);
    return data;
  },

  /** Configuração por cliente (etapa 4 do wizard) */
  async getClientConfig(clientId) {
    const { data } = await api.get(`/clients/${clientId}/notifications`);
    return data;
  },

  async updateClientConfig(clientId, payload) {
    const { data } = await api.patch(`/clients/${clientId}/notifications`, payload);
    return data;
  },
};

// ── Relatórios ────────────────────────────────────────────
export const reportsService = {
  async getDaily(clientId, date) {
    const { data } = await api.get(`/reports/daily/${clientId}`, { params: { date } });
    return data;
  },

  async exportDaily(clientId, date, format = 'pdf') {
    const { data } = await api.get(`/reports/daily/${clientId}/export`, {
      params: { date, format },
      responseType: 'blob',
    });
    return data;
  },
};

// ── Sync logs ─────────────────────────────────────────────
export const syncService = {
  async getLogs(clientId, params = {}) {
    const { data } = await api.get(`/sync/${clientId}/logs`, { params });
    return data;
  },

  async triggerNow(clientId) {
    const { data } = await api.post(`/sync/${clientId}/now`);
    return data;
  },
};
