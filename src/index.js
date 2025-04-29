import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import '@fortawesome/fontawesome-free/css/all.min.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';  // <-- NEW: import service worker

ReactDOM.render(
  <BrowserRouter>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </BrowserRouter>,
  document.getElementById('root')
);

// ✅ Register the service worker for PWA features
serviceWorkerRegistration.register();
