/**
 * HTTP client utilities for SafeSplitX middleware
 * Handles API communication with the backend
 */

const axios = require('axios');
const { getConfig, buildApiUrl, endpoints } = require('./config');
const { getAuthToken, setAuthToken, clearAuthToken, shouldRefreshToken } = require('./auth');
const { handleApiError, retryRequest } = require('./errorHandler');

/**
 * Request queue for handling token refresh scenarios
 */
let isRefreshing = false;
let failedQueue = [];

/**
 * Process queued requests after token refresh
 * @param {string} token - New token
 */
function processQueue(token) {
  failedQueue.forEach(({ resolve, config }) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    resolve(httpClient(config));
  });
  
  failedQueue = [];
}

/**
 * Create axios instance with default configuration
 */
const httpClient = axios.create({
  baseURL: getConfig('api.baseURL'),
  timeout: getConfig('api.timeout', 10000),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Request interceptor for adding authentication and request ID
 */
httpClient.interceptors.request.use(
  (config) => {
    // Add request ID for tracking
    config.metadata = {
      requestId: require('uuid').v4(),
      startTime: Date.now()
    };
    
    // Add authorization header if token exists
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (getConfig('logging.enabled', false)) {
      console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`, {
        requestId: config.metadata.requestId,
        headers: config.headers,
        data: config.data
      });
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for handling authentication and errors
 */
httpClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (getConfig('logging.enabled', false)) {
      const duration = Date.now() - response.config.metadata?.startTime;
      console.log(`[HTTP] ${response.status} ${response.config.url}`, {
        requestId: response.config.metadata?.requestId,
        duration: `${duration}ms`,
        data: response.data
      });
    }
    
    // Add metadata to response
    if (response.data && typeof response.data === 'object') {
      response.data.requestId = response.config.metadata?.requestId;
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Handle token refresh for 401 errors
      const token = getAuthToken();
      
      if (token && shouldRefreshToken(token)) {
        if (isRefreshing) {
          // Queue this request while refresh is in progress
          return new Promise((resolve) => {
            failedQueue.push({ resolve, config: originalRequest });
          });
        }
        
        originalRequest._retry = true;
        isRefreshing = true;
        
        try {
          const refreshToken = require('./auth').getRefreshToken();
          if (refreshToken) {
            const response = await axios.post(buildApiUrl(endpoints.auth.refresh), {
              refreshToken
            });
            
            const newToken = response.data.data?.token;
            if (newToken) {
              setAuthToken(newToken, response.data.data?.refreshToken);
              processQueue(newToken);
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return httpClient(originalRequest);
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          clearAuthToken();
          processQueue(null);
          
          // Trigger logout event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout', {
              detail: { reason: 'token_refresh_failed' }
            }));
          }
        } finally {
          isRefreshing = false;
        }
      } else {
        // Clear invalid token
        clearAuthToken();
        
        // Trigger logout event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout', {
            detail: { reason: 'invalid_token' }
          }));
        }
      }
    }
    
    // Log error in development
    if (getConfig('logging.enabled', false)) {
      console.error(`[HTTP] ${error.response?.status || 'ERROR'} ${originalRequest?.url}`, {
        requestId: originalRequest?.metadata?.requestId,
        error: error.message,
        response: error.response?.data
      });
    }
    
    return Promise.reject(error);
  }
);

/**
 * Make GET request
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function get(endpoint, params = {}, options = {}) {
  try {
    const response = await httpClient.get(endpoint, {
      params,
      ...options
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Make POST request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request payload
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function post(endpoint, data = {}, options = {}) {
  try {
    const response = await httpClient.post(endpoint, data, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Make PUT request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request payload
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function put(endpoint, data = {}, options = {}) {
  try {
    const response = await httpClient.put(endpoint, data, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Make PATCH request
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request payload
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function patch(endpoint, data = {}, options = {}) {
  try {
    const response = await httpClient.patch(endpoint, data, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Make DELETE request
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function del(endpoint, options = {}) {
  try {
    const response = await httpClient.delete(endpoint, options);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Upload file
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - Form data with file
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function upload(endpoint, formData, options = {}) {
  try {
    const response = await httpClient.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...options
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Make request with retry logic
 * @param {Function} requestFn - Request function
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries
 * @returns {Promise<Object>} Response data
 */
async function requestWithRetry(requestFn, maxRetries = null, delay = null) {
  const retries = maxRetries || getConfig('api.retries', 3);
  const retryDelay = delay || getConfig('api.retryDelay', 1000);
  
  return retryRequest(requestFn, retries, retryDelay);
}

/**
 * Create request with timeout
 * @param {Function} requestFn - Request function
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Response data
 */
async function requestWithTimeout(requestFn, timeout) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
  });
  
  return Promise.race([requestFn(), timeoutPromise]);
}

/**
 * Create cancellable request
 * @param {Function} requestFn - Request function that accepts CancelToken
 * @returns {Object} Request promise and cancel function
 */
function createCancellableRequest(requestFn) {
  const cancelTokenSource = axios.CancelToken.source();
  
  const request = requestFn(cancelTokenSource.token).catch(error => {
    if (axios.isCancel(error)) {
      return { cancelled: true, error: 'Request was cancelled' };
    }
    throw error;
  });
  
  return {
    request,
    cancel: cancelTokenSource.cancel
  };
}

/**
 * Batch multiple requests
 * @param {Array} requests - Array of request functions
 * @param {Object} options - Batch options
 * @returns {Promise<Array>} Array of responses
 */
async function batchRequests(requests, options = {}) {
  const { concurrency = 5, failFast = false } = options;
  
  if (failFast) {
    return Promise.all(requests.map(req => req()));
  }
  
  const results = [];
  
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchPromises = batch.map(async (req, index) => {
      try {
        return await req();
      } catch (error) {
        return { error: handleApiError(error), index: i + index };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Health check endpoint
 * @returns {Promise<Object>} Health status
 */
async function healthCheck() {
  try {
    const data = await get('/health');
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error.error || 'Health check failed'
    };
  }
}

module.exports = {
  httpClient,
  get,
  post,
  put,
  patch,
  delete: del,
  upload,
  requestWithRetry,
  requestWithTimeout,
  createCancellableRequest,
  batchRequests,
  healthCheck
};