// lib/api.ts
import axios from 'axios';
import { MyTokenObtainPair } from '@/types/api';
import { handleApiError } from './error-handler';

// =============================
// ✅ Token Utilities
// =============================

// Safe token getter (works on both server and client)
export const getToken = (tokenName = 'authToken') => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(tokenName);
  }
  return null;
};

// Safe token setter
export const setTokens = (authToken: string, refreshToken?: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', authToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }
};

// Token clearer
export const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }
};

// =============================
// 🔁 Token Refresh Function
// =============================
const refreshToken = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Token refresh not available on server');
  }

  try {
    const currentRefreshToken = getToken('refreshToken');
    if (!currentRefreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/accounts/auth/token/refresh/`,
      { refresh: currentRefreshToken }
    );

    const { access: newAuthToken, refresh: newRefreshToken } = response.data;

    // Store the new tokens. If the backend doesn't rotate refresh tokens,
    // newRefreshToken will be undefined, and the old one will be kept.
    setTokens(newAuthToken, newRefreshToken);

    return newAuthToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearTokens(); // Clear tokens on refresh failure
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw error;
  }
};

// =============================
// 🌐 Axios Instance
// =============================
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.100.137/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================
// 🚀 Request Interceptor
// =============================
api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (typeof window !== 'undefined') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        url: config.url
      });
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (typeof window !== 'undefined') {
      console.warn('No authentication token available for request:', config.url);
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// =============================
// ⚙️ Response Interceptor
// =============================
api.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined') {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Use our centralized error handler
    const errorMessage = handleApiError(error);

    if (typeof window !== 'undefined' && !error.response) {
      console.error('Network or CORS Error:', {
        message: error.message || 'Unknown network error',
        url: originalRequest?.url || 'Unknown URL',
      });
      return Promise.reject(new Error(errorMessage));
    }

    if (typeof window !== 'undefined') {
      const safeError = {
        url: originalRequest?.url || 'Unknown URL',
        method: originalRequest?.method || 'Unknown Method',
        status: error.response?.status || 'No response status',
        data: error.response?.data || error.message || 'No response data',
      };
      console.error('API Error:', safeError);
    }

    // Handle 401 Unauthorized - This is where the refresh logic is triggered
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== 'undefined') {
      console.log('Attempting token refresh for 401 error...');
      originalRequest._retry = true;

      try {
        const newToken = await refreshToken();
        if (newToken) {
          axios.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Redirecting to login after failed token refresh:', refreshError);
        // The refreshToken function already handles redirection
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 405 && typeof window !== 'undefined') {
      console.error('Method Not Allowed - Check API endpoint:', originalRequest?.url);
    }

    return Promise.reject(error);
  }
);

// Define a generic type for any paginated response from your API
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Helper function to automatically fetch all pages from a paginated endpoint.
 * Useful for dropdowns where we want to ensure all records are present.
 */
export async function fetchAllPages<T>(
  initialUrl: string,
  initialParams?: Record<string, any>
): Promise<T[]> {
  let allItems: T[] = [];
  let nextUrl: string | null = null;

  try {
    const initialResponse = await api.get<PaginatedResponse<T>>(initialUrl, {
      params: initialParams,
    });

    allItems = initialResponse.data.results || [];
    nextUrl = initialResponse.data.next;

    while (nextUrl) {
      // Extract the query string from the next URL to avoid double-prefixing issues
      const urlObj = new URL(nextUrl);
      const nextParams = Object.fromEntries(urlObj.searchParams.entries());

      // Use the clean initialUrl with the new params (like ?page=2)
      const subsequentResponse = await api.get<PaginatedResponse<T>>(initialUrl, {
        params: { ...initialParams, ...nextParams },
      });

      allItems = allItems.concat(subsequentResponse.data.results || []);
      nextUrl = subsequentResponse.data.next;
    }

    return allItems;
  } catch (error: any) {
    console.error(`Error fetching all pages for ${initialUrl}:`, error);
    return allItems;
  }
}

// =============================
// 🧩 Auth API Functions
// =============================
export const loginUser = (credentials: MyTokenObtainPair) => {
  return api.post('/accounts/auth/token/', credentials);
};

export const refreshAuthToken = (refresh: string) => {
  return api.post('/accounts/auth/token/refresh/', { refresh });
};

export const getCurrentUser = () => {
  return api.get('/accounts/users/me/');
};

// Export token helpers (Moved to inline exports)
