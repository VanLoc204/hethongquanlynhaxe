import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Bắt và bỏ qua lỗi AbortError do media play/pause của trình duyệt hoặc extension bên thứ ba
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.name === 'AbortError' ||
    (event.reason?.message && event.reason.message.includes('play() request was interrupted'))
  ) {
    event.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
