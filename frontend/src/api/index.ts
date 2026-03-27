import axios from 'axios';
import { useAuthStore } from '../store/auth';
import { API } from '../config';

const api = axios.create({
  baseURL: API.BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `${API.HEADERS.AUTH_PREFIX}${token}`;
  }
  return config;
});

export default api;
