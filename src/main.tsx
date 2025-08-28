import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Clients from './pages/Clients';
import RoutesPage from './pages/Routes';
import Driver from './pages/Driver';
import Settings from './pages/Settings';
import { TenantProvider } from './state/TenantContext';
import { AuthProvider } from './state/AuthContext';
import { registerSW } from './lib/pwa';
import { ToastProvider } from './state/ToastContext';
import ToastViewport from './components/ToastViewport';
import { RouteProvider } from './state/RouteContext';
import Team from './pages/Team';
import Signup from './pages/Signup';

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  // Permite entrar a /:tenant directamente (ej: /acme)
  { path: '/:tenant', element: <Dashboard /> },
  { path: '/:tenant/login', element: <Login /> },
  { path: '/:tenant/app', element: <Dashboard /> },
  { path: '/:tenant/clients', element: <Clients /> },
  { path: '/:tenant/routes', element: <RoutesPage /> },
  { path: '/:tenant/driver', element: <Driver /> },
  { path: '/:tenant/settings', element: <Settings /> },
  { path: '/:tenant/team', element: <Team /> },
  { path: '/signup', element: <Signup /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantProvider>
      <AuthProvider>
        <ToastProvider>
          <RouteProvider>
            <RouterProvider router={router} />
          </RouteProvider>
          <ToastViewport />
        </ToastProvider>
      </AuthProvider>
    </TenantProvider>
  </React.StrictMode>
);

// Register PWA Service Worker only when enabled
const ENABLE_SW = (import.meta as any).env?.VITE_ENABLE_SW;
if ((import.meta as any).env?.PROD && ENABLE_SW !== 'false') {
  registerSW();
}
