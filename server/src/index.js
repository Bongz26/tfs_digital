import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { API_HOST } from './api/config';

// Warm up backend using the same host the API layer uses
fetch(`${API_HOST}/api/health`)
  .then(() => console.log('✅ Backend pre-warmed:', API_HOST))
  .catch(() => console.log('⚠️ Backend cold start or unreachable:', API_HOST));

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
