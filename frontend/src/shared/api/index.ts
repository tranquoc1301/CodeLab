import axios from 'axios';
import { useAuthStore } from '@/app/store/auth';
import { API } from '@/shared/config';

const api = axios.create({
  baseURL: API.BASE_URL,
  withCredentials: true,  // Enable sending cookies with requests
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRequest = url.includes('/auth/login') ||
                            url.includes('/auth/register') ||
                            url.includes('/auth/me');

      // Only redirect to login if NOT an auth endpoint
      // Auth endpoints legitimately return 401 when not authenticated
      if (!isAuthRequest) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
