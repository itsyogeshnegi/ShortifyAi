import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shortifyai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function downloadUrl(filename) {
  return `${api.defaults.baseURL}/download/${filename}`;
}

export function mediaUrl(filename) {
  return `${api.defaults.baseURL}/media/videos/${filename}`;
}

export function thumbUrl(filename) {
  return `${api.defaults.baseURL}/media/thumbs/${filename}`;
}
