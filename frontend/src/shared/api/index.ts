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
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isRegisterRequest = error.config?.url?.includes('/auth/register');

      // Only redirect to login if NOT a login/register attempt
      // This allows the login form to handle 401 errors itself
      if (!isLoginRequest && !isRegisterRequest) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
