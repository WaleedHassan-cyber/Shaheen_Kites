import axios from 'axios';
import { API_URL } from './config';

const api = axios.create({ baseURL: API_URL });

// Counts requests in flight so <TopBar /> knows when to show.
let pending = 0;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l(pending));
export const subscribePending = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const done = () => { pending = Math.max(0, pending - 1); emit(); };

api.interceptors.request.use((cfg) => {
  pending += 1;
  emit();
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => { done(); return r; },
  (err) => {
    done();
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLogin && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) => e.response?.data?.message || 'Could not reach the server. Check your connection';
export default api;
