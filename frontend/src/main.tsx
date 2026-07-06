import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppStateProvider } from './context/AppStateContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/shared/ToastContext';
import './styles/tokens.css';
import './styles/global.css';
import './styles/pdf.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppStateProvider>
            <App />
          </AppStateProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
