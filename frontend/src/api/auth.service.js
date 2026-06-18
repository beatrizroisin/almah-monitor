import api from './client';

// Espelha auth.controller.ts: POST /auth/login · /auth/refresh · /auth/logout

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('almah_access_token', data.access_token);
    localStorage.setItem('almah_refresh_token', data.refresh_token);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('almah_access_token');
      localStorage.removeItem('almah_refresh_token');
    }
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem('almah_access_token'));
  },
};
