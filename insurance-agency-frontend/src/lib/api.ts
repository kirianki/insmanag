import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});


// Request Interceptor: Attaches the access token to every outgoing request.
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// **THE FIX:** Response Interceptor: Handles expired access tokens.
api.interceptors.response.use(
  // If the response is successful, just return it.
  (response) => response,
  // If the response is an error...
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is a 401 and we haven't already retried this request.
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark that we are retrying this request.

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // If no refresh token, logout the user.
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Make the refresh token request.
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/accounts/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        // Store the new access token.
        localStorage.setItem('accessToken', data.access);

        // Update the authorization header on our original request.
        api.defaults.headers.common['Authorization'] = 'Bearer ' + data.access;
        originalRequest.headers['Authorization'] = 'Bearer ' + data.access;

        // Retry the original request with the new token.
        return api(originalRequest);
      } catch (refreshError) {
        // If the refresh token is also invalid, logout the user.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // For any other errors, just pass them along.
    return Promise.reject(error);
  }
);

export default api;