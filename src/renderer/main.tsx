import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('React main.tsx loading...');

// Add error handling for the entire loading process
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const rootElement = document.getElementById('root');
  console.log('Root element found:', !!rootElement);

  if (rootElement) {
    console.log('Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    console.log('React root created, rendering App...');
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    
    console.log('React app rendered successfully');
  } else {
    console.error('Root element not found!');
  }
} catch (error) {
  console.error('Error during React initialization:', error);
  
  // Fallback: show error message
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #111827; color: #f97316; font-family: 'Cinzel', serif;">
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
          <h1 style="font-size: 2rem; margin-bottom: 0.5rem; color: #dc2626;">React Loading Failed</h1>
          <p style="color: #fdba74; margin-bottom: 1rem;">Error: ${error.message}</p>
          <p style="color: #9ca3af; font-size: 0.9rem;">Check DevTools console for details</p>
        </div>
      </div>
    `;
  }
}