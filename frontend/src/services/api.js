import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Network error (only if truly no response)
    if (!error.response) {
      window.dispatchEvent(new CustomEvent('network-error'));
    }
    
    // Handle specific error cases (but don't trigger network error)
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-error'));
    }
    
    if (error.response?.status === 404) {
      window.dispatchEvent(new CustomEvent('not-found-error'));
    }
    
    // Don't trigger network error for rate limits or server errors
    if (error.response?.status >= 500 && error.response?.status !== 429) {
      window.dispatchEvent(new CustomEvent('server-error'));
    }
    
    return Promise.reject(error);
  }
);

// Jikan API (MyAnimeList) - Direct calls
export const jikanAPI = {
  getAnimeEpisodes: (animeId) => 
    axios.get(`https://api.jikan.moe/v4/anime/${animeId}/episodes`),
  getAnimeDetails: (animeId) => 
    axios.get(`https://api.jikan.moe/v4/anime/${animeId}`),
  getAnimeStreaming: (animeId) => 
    axios.get(`https://api.jikan.moe/v4/anime/${animeId}/streaming`),
  getAnimeRelations: (animeId) => 
    axios.get(`https://api.jikan.moe/v4/anime/${animeId}/relations`),
};

// API endpoints
export const animeListAPI = {
  getMyList: () => api.get('/api/auth/my-list'),
  addToList: (animeData) => api.post('/api/auth/add-to-list', animeData),
  removeFromList: (animeId) => api.delete(`/api/auth/remove-from-list/${animeId}`),
};