import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // Crucial para envío y recepción automática de Cookies HttpOnly
  headers: {
    'Content-Type': 'application/json',
  },
});

let csrfToken;
let csrfRequest;
api.interceptors.request.use(async (request) => {
  if (!['get','head','options'].includes((request.method || 'get').toLowerCase())) {
    if (!csrfToken) {
      csrfRequest ||= axios.get('/api/v1/auth/csrf', { withCredentials:true }).then(({data}) => { csrfToken=data.token; return csrfToken; }).finally(()=>{csrfRequest=null;});
      await csrfRequest;
    }
    request.headers['X-CSRF-Token']=csrfToken;
  }
  return request;
});
// Interceptor de respuesta para manejar sesiones expiradas (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.code === 'CSRF_INVALID') csrfToken = null;
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
