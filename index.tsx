import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // In some sandboxed environments, service worker registration can fail
    // due to cross-origin restrictions. To ensure the application loads
    // without console errors, we check for the problematic origin and
    // skip registration if detected.
    try {
      if (window.location.origin.includes('usercontent.goog')) {
        console.warn('Service Worker registration skipped in preview environment to prevent cross-origin errors.');
        return;
      }

      navigator.serviceWorker.register('./service-worker.js')
        .then(registration => {
          console.log('AstroCapture Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    } catch (error) {
      console.error('An unexpected error occurred during Service Worker registration setup:', error);
    }
  });
}

// FIX: To prevent a race condition where the script executes before the DOM is fully parsed,
// the app rendering is deferred until the DOM is ready.
const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Check if the DOM is already loaded. If it is, render the app immediately.
// Otherwise, wait for the DOMContentLoaded event.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
