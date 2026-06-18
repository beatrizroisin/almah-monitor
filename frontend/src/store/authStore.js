import { create } from 'zustand';
import { authService } from '../api/auth.service';

export const useAuthStore = create((set) => ({
  isAuthenticated: authService.isAuthenticated(),
  user: null,
  loading: false,
  error: null,

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const data = await authService.login(email, password);
      set({ isAuthenticated: true, user: data.user ?? null, loading: false });
      return true;
    } catch (err) {
      set({
        loading: false,
        error: err.response?.data?.message || 'E-mail ou senha inválidos.',
      });
      return false;
    }
  },

  async logout() {
    await authService.logout();
    set({ isAuthenticated: false, user: null });
  },
}));
