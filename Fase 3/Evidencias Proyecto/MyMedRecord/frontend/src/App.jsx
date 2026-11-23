import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <CookieConsentBanner />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
