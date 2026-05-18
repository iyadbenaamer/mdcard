import axios from "axios";

const API_URL = `${import.meta.env.VITE_APP_API}`;

const axiosClient = axios.create({ baseURL: API_URL, withCredentials: true });
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

export default axiosClient;
