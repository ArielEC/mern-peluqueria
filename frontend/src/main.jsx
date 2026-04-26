import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import queryClient from '@/lib/queryClient';
import NotificationToaster from '@/components/ui/NotificationToaster';
import RouteScrollRestoration from '@/components/layout/RouteScrollRestoration';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RouteScrollRestoration />
        <App />
        <NotificationToaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
