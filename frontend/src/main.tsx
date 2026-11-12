import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { useTheme } from './store/theme.store';
import { useAuthStore } from './store/auth.store';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function Root() {
  const applyTheme = useTheme((state) => state.applyTheme);
  const loadUser = useAuthStore((state) => state.loadUser);

  React.useEffect(() => {
    applyTheme();

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [applyTheme]);

  // Resolve the initial session so protected routes know whether to redirect.
  React.useEffect(() => {
    void loadUser();
  }, [loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
