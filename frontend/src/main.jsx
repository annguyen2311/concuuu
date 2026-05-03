import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || '';
if (API_URL) {
  axios.defaults.baseURL = API_URL;
}

axios.interceptors.request.use((config) => {
  const hasAuthorization = Boolean(config.headers?.Authorization || config.headers?.authorization);
  const token = localStorage.getItem('token');

  if (token && !hasAuthorization) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
