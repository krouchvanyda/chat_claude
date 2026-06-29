import axios from 'axios';
import {API_URL} from '../config';

/**
 * Single shared Axios instance used by every API module.
 * All REST calls go through this client (per project convention).
 */
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Lightweight logging interceptor to make backend issues visible during dev.
apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    console.log(
      `API error [${status ?? 'no-response'}] ${url ?? ''}`,
      error?.message,
    );
    return Promise.reject(error);
  },
);

export default apiClient;
