import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import AppProviders from '@app-providers';
import App from './App';
import './index.css';

const rawBase = import.meta.env.BASE_URL || '/';
const routerBase = rawBase === '/' ? '/' : rawBase.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBase}>
      <AppProviders>
        <App />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1A1A1A',
              border: '1px solid #27272A',
              color: '#FFFFFF',
            },
          }}
        />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>
);
