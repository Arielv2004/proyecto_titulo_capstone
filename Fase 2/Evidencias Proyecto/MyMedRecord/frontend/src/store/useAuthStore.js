import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Verificar sesión actual contra el backend (usa cookie HttpOnly)
  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.data?.user) {
        set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      const user = res.data.data.user;
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true, user };
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', userData);
      const user = res.data.data.user;
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true, user };
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al registrar usuario';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      set({ user: null, isAuthenticated: false, error: null });
    }
  },
}));
