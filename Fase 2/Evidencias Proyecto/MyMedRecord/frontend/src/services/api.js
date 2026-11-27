
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    ...(import.meta.env.VITE_API_URL
      ? { 'ngrok-skip-browser-warning': 'true' }
      : {}),
  },
});

// Interceptor de respuesta para manejar sesiones expiradas (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si la sesión expiró y no estamos ya en login
      if (!window.location.pathname.includes('/login')) {
        // Manejar expiración si es necesario
      }
    }

    return Promise.reject(error);
  }
);

export default api;
