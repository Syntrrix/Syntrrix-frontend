import axios from 'axios';
import { clearAuthState, getAccessToken } from '../utils/storage';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/api/';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.app.syntrrix.com/api/';

// Default for small JSON calls; heavy endpoints (e.g. bot flow) pass their own timeout.
const DEFAULT_TIMEOUT = 30000;

const extractErrorMessage = (payload) => {
  if (!payload) {
    return 'Unexpected error occurred. Please try again.';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (payload.message) {
    return payload.message;
  }
  if (payload.detail != null) {
    if (typeof payload.detail === 'string') return payload.detail;
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((d) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d)))
        .filter(Boolean)
        .join(', ');
    }
  }
  if (payload.errors) {
    if (Array.isArray(payload.errors)) {
      return payload.errors.join(', ');
    }
    if (typeof payload.errors === 'object') {
      return Object.values(payload.errors)
        .flat()
        .join(', ');
    }
  }
  return 'Unexpected error occurred. Please try again.';
};

const logApiFailure = (error) => {
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_LOG_API_ERRORS !== '1') {
    return;
  }
  const cfg = error?.config || {};
  const method = (cfg.method || 'GET').toUpperCase();
  const path = cfg.url || '';
  const base = cfg.baseURL || '';
  if (!error?.response) {
    // eslint-disable-next-line no-console
    console.error('[API]', method, `${base}${path}`, error?.code || '', error?.message || error);
    return;
  }
  const { status, data } = error.response;
  // eslint-disable-next-line no-console
  console.error('[API]', method, `${base}${path}`, status, data ?? '(empty body)');
};

// Create a pre-configured axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Attach auth token & allow per-request overrides
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CRITICAL: For FormData, delete Content-Type to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    // Support custom timeout/header overrides via config.meta
    if (config.meta && typeof config.meta.timeout === 'number') {
      config.timeout = config.meta.timeout;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Centralized error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, code, message } = error;

    // Network / timeout errors
    if (!response) {
      logApiFailure(error);
      const isTimeout = code === 'ECONNABORTED';
      const isNetwork = !isTimeout && (message === 'Network Error' || String(message || '').includes('ERR_FAILED'));
      if (isNetwork && (process.env.NODE_ENV === 'development' || process.env.REACT_APP_LOG_API_ERRORS === '1')) {
        // eslint-disable-next-line no-console
        console.warn(
          '[API] Network: check CORS (origin allowed on API), TLS, nginx client_max_body_size / proxy_read_timeout (bot saves).',
        );
      }
      const timeoutOrNetworkError = new Error(
        isTimeout ? 'Request timed out. Please try again.' : 'Unable to reach the server. Check your connection and try again.',
      );
      timeoutOrNetworkError.status = isTimeout ? 408 : 0;
      throw timeoutOrNetworkError;
    }

    const { status, data } = response;

    if (status === 401) {
      clearAuthState();
    }

    logApiFailure(error);

    const msg =
      status === 413
        ? 'Request too large (HTTP 413). The API proxy (nginx/Cloudflare) rejected the body — raise client_max_body_size (e.g. 50m) on the API host.'
        : extractErrorMessage(data);
    const wrappedError = new Error(msg);
    wrappedError.status = status;
    wrappedError.data = data;
    throw wrappedError;
  },
);

// Keep the same public API used by the rest of the app
const request = async (method, path, body, options = {}) => {
  const { headers, timeout, ...restOptions } = options || {};

  // If body is FormData, don't set Content-Type header (axios will set it with boundary)
  let requestHeaders = {};
  if (body instanceof FormData) {
    // For FormData, let axios set Content-Type automatically with boundary
    // Don't set any Content-Type header - axios will handle it
    // Only merge custom headers that don't include Content-Type
    if (headers) {
      Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() !== 'content-type') {
          requestHeaders[key] = headers[key];
        }
      });
    }
    // Explicitly delete Content-Type from axios instance defaults for this request
    requestHeaders = { ...requestHeaders };
  } else {
    // For JSON, use default headers
    requestHeaders['Content-Type'] = 'application/json';
    if (headers) {
      Object.assign(requestHeaders, headers);
    }
  }

  const config = {
    url: path,
    method,
    data: body,
    // Pass custom timeout via meta so interceptor can read it
    meta: timeout ? { timeout } : undefined,
    ...restOptions,
  };

  // For FormData, don't set Content-Type at all - let axios handle it
  if (body instanceof FormData) {
    // Don't set any headers - axios will automatically set Content-Type with boundary
    config.headers = requestHeaders; // Only non-Content-Type headers
  } else {
    config.headers = requestHeaders;
  }

  const response = await axiosInstance.request(config);

  // Match previous shape: { data }
  return { data: response.data };
};

const apiClient = {
  get: (path, options) => request('GET', path, null, options),
  post: (path, body, options) => request('POST', path, body, options),
  put: (path, body, options) => request('PUT', path, body, options),
  patch: (path, body, options) => request('PATCH', path, body, options),
  delete: (path, options) => request('DELETE', path, null, options),
};

export const getApiBaseUrl = () => {
  return API_BASE_URL;
};

export const getApiOrigin = () => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch (e) {
    let url = API_BASE_URL.replace(/\/api\/?$/, '');
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  }
};

export default apiClient;



