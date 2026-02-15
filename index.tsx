
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Mounting error:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: #f87171; font-family: sans-serif; text-align: center;">
      <h3 style="margin-bottom: 10px;">Application Rendering Failed</h3>
      <p style="font-size: 14px; opacity: 0.8;">Check the browser console for details.</p>
    </div>
  `;
}
