import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Response interceptor ─────────────────────────────────────────────────────
// If server returns 401 (token expired / not logged in)
// redirect user to login page automatically
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // clear any stale state and redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;