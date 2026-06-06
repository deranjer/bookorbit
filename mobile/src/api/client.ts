import axios, { create } from 'axios';
import { tokenStore } from '@/src/auth/tokenStore';
import { serverUrlStore } from '@/src/auth/serverUrlStore';

let isRefreshing = false;

// Without a timeout, requests to an unreachable host (e.g. an IP with a wrong/
// missing port) hang forever and the UI spinner never resolves.
export const api = create({ timeout: 10000 });

api.interceptors.request.use((config) => {
  const base = serverUrlStore.get();
  if (base) {
    config.baseURL = `${base}/api/v1`;
  }
  const token = tokenStore.get();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const base = serverUrlStore.get();
        const res = await axios.post(`${base}/api/v1/auth/refresh`, {}, { withCredentials: true });
        const newToken: string = (res.data as { accessToken: string }).accessToken;
        tokenStore.set(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        tokenStore.set(null);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export function coverUri(bookId: number): string {
  const base = serverUrlStore.get() ?? '';
  return `${base}/api/v1/books/${bookId}/cover`;
}

export function coverHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function authorThumbUri(id: number): string {
  const base = serverUrlStore.get() ?? '';
  return `${base}/api/v1/authors/${id}/thumbnail`;
}
