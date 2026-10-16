import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global API Auto-Routing for Ngrok / Docker Gateway / Localhost
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.includes('http://localhost:8000/api/v1')) {
    const targetBase = window.location.port === '3001' ? 'http://localhost:8000/api/v1' : '/api/v1';
    url = url.replace('http://localhost:8000/api/v1', targetBase);
  }
  return originalFetch.call(this, url, options);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register PWA Service Worker for Offline & Installable Web App
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration failed:', err);
    });
  });
}
