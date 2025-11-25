import axios from 'axios';
import { getAccessToken, refreshAccessToken, clearAuthData } from './auth';

const http = axios.create();

http.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response && error.response.status === 401 && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newToken}` };
        return http(original);
      }
      clearAuthData();
    }
    return Promise.reject(error);
  }
);

export default http;
