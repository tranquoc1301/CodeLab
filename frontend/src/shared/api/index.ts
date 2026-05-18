import axios from 'axios';
import { useAuthStore } from '@/app/store/auth';
import { API } from '@/shared/config';
import { ROUTES } from '@/app/router';

const AUTH_PATHS = [
  API.ENDPOINTS.AUTH_LOGIN,
  API.ENDPOINTS.AUTH_REGISTER,
  API.ENDPOINTS.AUTH_ME,
];

const api = axios.create({
  baseURL: API.BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRequest = AUTH_PATHS.some((path) => url.includes(path));

      if (!isAuthRequest) {
        useAuthStore.getState().logout();
        window.location.href = ROUTES.LOGIN;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
