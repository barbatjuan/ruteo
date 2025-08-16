import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Clients from './pages/Clients';
import RoutesPage from './pages/Routes';
import Settings from './pages/Settings';
import { TenantProvider } from './state/TenantContext';
import { AuthProvider } from './state/AuthContext';
import { registerSW } from './lib/pwa';
import { ToastProvider } from './state/ToastContext';
import ToastViewport from './components/ToastViewport';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/:tenant/login', element: <Login /> },
  { path: '/:tenant/app', element: <Dashboard /> },
  { path: '/:tenant/clients', element: <Clients /> },
  { path: '/:tenant/routes', element: <RoutesPage /> },
  { path: '/:tenant/settings', element: <Settings /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantProvider>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          <ToastViewport />
        </ToastProvider>
      </AuthProvider>
    </TenantProvider>
  </React.StrictMode>
);

// Register PWA Service Worker
registerSW();
