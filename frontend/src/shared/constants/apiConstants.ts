export const API_BASE_URL = __DEV__
  ? 'http://localhost:5000'
  : 'https://your-render-app.onrender.com';

export const SIGNALR_HUB_URL = `${API_BASE_URL}/hubs/game`;
