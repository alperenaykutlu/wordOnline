import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { store }           from '../store';
import { setAccessToken, logout } from '../../features/auth/store/authSlice';
import { secureStorage }   from '../utils/secureStorage';
import { API_BASE_URL }    from '../constants/apiConstants';

let isRefreshing        = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}
function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

export const apiClient: AxiosInstance = axios.create({
  baseURL:        `${API_BASE_URL}/api`,
  timeout:        10_000,
  headers:        { 'Content-Type': 'application/json' },
  withCredentials:true,
});

// Request — JWT inject
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.get('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response — Token Rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);
    original._retry = true;

    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        subscribeTokenRefresh(resolve);
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = data.accessToken;
      await secureStorage.set('accessToken', newToken);
      store.dispatch(setAccessToken(newToken));
      onRefreshed(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      refreshSubscribers = [];
      await secureStorage.clear();
      store.dispatch(logout());
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
