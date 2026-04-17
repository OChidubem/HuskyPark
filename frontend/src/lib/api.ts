/**
 * Centralized Axios instance.
 * - Base URL from VITE_API_BASE_URL env variable
 * - Credentials (HttpOnly cookie) included on every request
 * - 401 responses redirect to /login
 */

import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
