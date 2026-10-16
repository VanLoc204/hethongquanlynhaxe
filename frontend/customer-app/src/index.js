import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

// Global API Auto-Routing for Ngrok / Docker Gateway / Localhost
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.includes('http://localhost:8000/api/v1')) {
    const targetBase = window.location.port === '3000' ? 'http://localhost:8000/api/v1' : '/api/v1';
    url = url.replace('http://localhost:8000/api/v1', targetBase);
  }
  return originalFetch.call(this, url, options);
};

axios.interceptors.request.use((config) => {
  if (config.url && config.url.includes('http://localhost:8000/api/v1')) {
    const targetBase = window.location.port === '3000' ? 'http://localhost:8000/api/v1' : '/api/v1';
    config.url = config.url.replace('http://localhost:8000/api/v1', targetBase);
  }
  return config;
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
