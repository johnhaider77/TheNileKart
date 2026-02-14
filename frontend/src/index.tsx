import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './styles/components.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  event.preventDefault();
});

// Unhandled rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection caught:', event.reason);
  event.preventDefault();
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <App />
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
