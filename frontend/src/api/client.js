import axios from 'axios';

// ────────────────────────────────────────────────────────────
// Client HTTP central.
//
// A URL base vem de uma env var do Vite — ver .env.example.
// Em dev local, normalmente http://localhost:3000
// Em produção, a URL pública do backend (Render/Railway/EC2 etc).
// ────────────────────────────────────────────────────────────

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Injeta o access_token salvo no localStorage em toda requisição.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('almah_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o access_token expirar (401), tenta renovar uma vez com o
// refresh_token antes de forçar logout. Evita loop infinito com
// a flag _retry.
let isRefreshing = false;
let refreshQueue = [];

function resolveQueue(token) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status !== 401 || config._retry || config.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    config._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) return reject(error);
          config.headers.Authorization = `Bearer ${token}`;
          resolve(api(config));
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = localStorage.getItem('almah_refresh_token');
      if (!refreshToken) throw new Error('Sem refresh token');

      const { data } = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken });
      localStorage.setItem('almah_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('almah_refresh_token', data.refresh_token);
      }
      resolveQueue(data.access_token);
      config.headers.Authorization = `Bearer ${data.access_token}`;
      return api(config);
    } catch (refreshError) {
      resolveQueue(null);
      localStorage.removeItem('almah_access_token');
      localStorage.removeItem('almah_refresh_token');
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
