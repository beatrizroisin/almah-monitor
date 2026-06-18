import { create } from 'zustand';
import { clientsService } from '../api/clients.service';
import { integrationsService } from '../api/integrations.service';

const initialState = {
  step: 1,
  clientId: null, // preenchido após etapa 1 (POST /clients retorna o id)

  // Etapa 1 — dados do cliente
  name: '',
  platform: 'VTEX',
  vtexAccount: '',
  merchantId: '',
  storeUrl: '',
  mediaOwnerId: '',
  devOwnerId: '',
  notes: '',

  // Etapa 2 — VTEX
  vtexAppKey: '',
  vtexAppToken: '',
  vtexTestResult: null, // { status, sku_count } | { error }
  vtexTesting: false,

  // Etapa 3 — Google
  googleAuthUrl: null,
  googleConnected: false,
  googleSummary: null,

  // Etapa 4 — Notificações
  notifyEmail: { enabled: true, value: '' },
  notifyDiscord: { enabled: false, value: '' },
  notifyWhatsapp: { enabled: false, value: '' },
  severityRed: true,
  severityOrange: true,
  severityYellow: false,
  reportTime: '08:00',

  // Etapa 5
  syncNowOnSave: true,

  submitting: false,
  error: null,
};

export const useWizardStore = create((set, get) => ({
  ...initialState,

  setField(field, value) {
    set({ [field]: value });
  },

  goToStep(step) {
    set({ step });
  },

  reset() {
    set(initialState);
  },

  /** Etapa 1 → POST /clients (cria com status PENDING) */
  async submitStep1() {
    const s = get();
    set({ submitting: true, error: null });
    try {
      const client = await clientsService.create({
        name: s.name,
        platform: s.platform,
        vtex_account: s.vtexAccount,
        merchant_id: s.merchantId,
        store_url: s.storeUrl,
        media_owner_id: s.mediaOwnerId || null,
        dev_owner_id: s.devOwnerId || null,
        notes: s.notes,
      });
      set({ clientId: client.id, submitting: false, step: 2 });
      return true;
    } catch (err) {
      set({ submitting: false, error: err.response?.data?.message || 'Erro ao salvar dados do cliente.' });
      return false;
    }
  },

  /** Etapa 2 — testa a conexão antes de seguir */
  async testVtexConnection() {
    const s = get();
    set({ vtexTesting: true, vtexTestResult: null });
    try {
      const result = await integrationsService.testVtex(s.clientId, {
        appKey: s.vtexAppKey,
        appToken: s.vtexAppToken,
      });
      set({ vtexTestResult: result, vtexTesting: false });
      return true;
    } catch (err) {
      set({
        vtexTestResult: { error: err.response?.data?.message || 'Falha ao conectar com a VTEX.' },
        vtexTesting: false,
      });
      return false;
    }
  },

  /** Etapa 2 → POST /integrations/vtex/connect (salva de fato) */
  async submitStep2() {
    const s = get();
    set({ submitting: true, error: null });
    try {
      await integrationsService.connectVtex(s.clientId, {
        appKey: s.vtexAppKey,
        appToken: s.vtexAppToken,
      });
      set({ submitting: false, step: 3 });
      return true;
    } catch (err) {
      set({ submitting: false, error: err.response?.data?.message || 'Erro ao salvar credenciais VTEX.' });
      return false;
    }
  },

  /** Etapa 3 — gera URL OAuth e abre popup/redirect */
  async startGoogleOAuth() {
    const s = get();
    set({ submitting: true, error: null });
    try {
      const { url } = await integrationsService.getGoogleAuthUrl(s.clientId);
      set({ googleAuthUrl: url, submitting: false });
      window.open(url, '_blank', 'width=520,height=640');
      return url;
    } catch (err) {
      set({ submitting: false, error: 'Erro ao gerar URL de autorização Google.' });
      return null;
    }
  },

  /** Chamado quando o popup do OAuth fecha — confirma se o callback já processou */
  async checkGoogleStatus() {
    const s = get();
    try {
      const status = await integrationsService.checkGoogleCallbackStatus(s.clientId);
      const connected = status?.status === 'CONNECTED';
      set({ googleConnected: connected, googleSummary: status });
      return connected;
    } catch {
      return false;
    }
  },

  /** Etapa 4 → PATCH /clients/:id (sem endpoint separado, conforme doc) */
  async submitStep4() {
    const s = get();
    set({ submitting: true, error: null });
    try {
      await clientsService.update(s.clientId, {
        notifications: {
          email: s.notifyEmail,
          discord: s.notifyDiscord,
          whatsapp: s.notifyWhatsapp,
          severities: {
            red: s.severityRed,
            orange: s.severityOrange,
            yellow: s.severityYellow,
          },
          report_time: s.reportTime,
        },
      });
      set({ submitting: false, step: 5 });
      return true;
    } catch (err) {
      set({ submitting: false, error: 'Erro ao salvar configuração de notificações.' });
      return false;
    }
  },

  /** Etapa 5 → PATCH /clients/:id { status: ACTIVE } + sync opcional */
  async finish() {
    const s = get();
    set({ submitting: true, error: null });
    try {
      await clientsService.activate(s.clientId, { syncNow: s.syncNowOnSave });
      set({ submitting: false });
      return true;
    } catch (err) {
      set({ submitting: false, error: 'Erro ao ativar cliente.' });
      return false;
    }
  },
}));
