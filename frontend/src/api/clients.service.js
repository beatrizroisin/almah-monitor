import api from './client';

// Espelha clients.controller.ts (documento 01_almah_backend_nestjs_v2):
// GET/POST/PATCH/DELETE /clients · GET /clients/:id/dashboard · /summary

export const clientsService = {
  /** Lista paginada com filtros opcionais: { status, search, page, pageSize } */
  async list(params = {}) {
    const { data } = await api.get('/clients', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/clients/${id}`);
    return data;
  },

  /** Etapa 1 do wizard — cria cliente com status PENDING */
  async create(payload) {
    const { data } = await api.post('/clients', payload);
    return data;
  },

  /** Usado nas etapas 4 e 5 do wizard, e na tela de edição */
  async update(id, payload) {
    const { data } = await api.patch(`/clients/${id}`, payload);
    return data;
  },

  async remove(id) {
    const { data } = await api.delete(`/clients/${id}`);
    return data;
  },

  async getIntegrations(id) {
    const { data } = await api.get(`/clients/${id}/integrations`);
    return data;
  },

  async getDashboard(id) {
    const { data } = await api.get(`/clients/${id}/dashboard`);
    return data;
  },

  async getSummary(id) {
    const { data } = await api.get(`/clients/${id}/summary`);
    return data;
  },

  /** Dispara sync manual — botão "Sincronizar agora" */
  async triggerSync(id) {
    const { data } = await api.post(`/clients/${id}/sync`);
    return data;
  },

  /** Ativa o cliente na etapa 5 do wizard */
  async activate(id, { syncNow = true } = {}) {
    const { data } = await api.patch(`/clients/${id}`, { status: 'ACTIVE' });
    if (syncNow) {
      await this.triggerSync(id);
    }
    return data;
  },
};
