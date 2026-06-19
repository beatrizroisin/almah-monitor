import { create } from 'zustand';
import { clientsService } from '../api/clients.service';
import { dashboardService } from '../api';

export const useClientsStore = create((set, get) => ({
  clients: [],
  selectedClient: null,
  selectedClientDashboard: null,
  overview: null,
  loading: false,
  error: null,

  async fetchClients(params = {}) {
    set({ loading: true, error: null });
    try {
      const data = await clientsService.list(params);
      set({ clients: data.items ?? data, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  async fetchOverview() {
    set({ loading: true, error: null });
    try {
      const overview = await dashboardService.getOverview();
      set({ overview, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  async selectClient(id) {
    set({ loading: true, error: null });
    try {
      const [client, dashboard] = await Promise.all([
        clientsService.getById(id),
        clientsService.getDashboard(id),
      ]);
      set({ selectedClient: client, selectedClientDashboard: dashboard, loading: false });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  async removeClient(id) {
    await clientsService.remove(id);
    set((state) => ({ clients: state.clients.filter((c) => c.id !== id) }));
  },

  async triggerSync(id) {
    await clientsService.triggerSync(id);
    // Re-busca o cliente selecionado se for o mesmo, para refletir o novo status
    if (get().selectedClient?.id === id) {
      await get().selectClient(id);
    }
  },

  clearSelected() {
    set({ selectedClient: null, selectedClientDashboard: null });
  },
}));
