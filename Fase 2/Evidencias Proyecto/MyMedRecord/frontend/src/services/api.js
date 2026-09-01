import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Crucial para envío y recepción automática de Cookies HttpOnly
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de respuesta para manejar sesiones expiradas (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si la sesión expiró y no estamos ya en login, redirigir
      if (!window.location.pathname.includes('/login')) {
        // Manejar expiración si es necesario
      }
    }
    return Promise.reject(error);
  }
);

export default api;
