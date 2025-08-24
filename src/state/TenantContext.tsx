import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../lib/supabase';

export type Tenant = { id: string; name: string; plan: 'Free' | 'Pro' | 'Business' };

type TenantContextType = {
  tenant: Tenant | null;
  setTenant: (t: Tenant | null) => void;
  // Public identifiers
  tenantSlug: string | null;
  tenantUuid: string | null;
  tenantLoading: boolean;
  // Backwards-compat: returns slug
  resolveTenantFromLocation: () => string | null;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantUuid, setTenantUuid] = useState<string | null>(null);
  const [tenantLoading, setTenantLoading] = useState<boolean>(false);
  // Parse first path segment from URL (can be UUID or legacy slug)
  useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const recompute = () => {
      const [, seg] = window.location.pathname.split('/');
      const val = seg || null;
      setTenantSlug(val);
      if (val && uuidRegex.test(val)) {
        setTenantUuid(val);
        setTenantLoading(false);
      } else if (!val) {
        setTenantUuid(null);
        setTenantLoading(false);
      }
    };
    // Initial compute
    recompute();
    // Listen to navigation events (popstate + patched pushState/replaceState)
    const onPop = () => recompute();
    window.addEventListener('popstate', onPop);
    // Patch history methods once
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (history as any).pushState = function (this: History, ...args: any[]) {
      (origPush as any).apply(this, args as any);
      window.dispatchEvent(new Event('app:navigation'));
    } as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (history as any).replaceState = function (this: History, ...args: any[]) {
      (origReplace as any).apply(this, args as any);
      window.dispatchEvent(new Event('app:navigation'));
    } as any;
    const onNav = () => recompute();
    window.addEventListener('app:navigation', onNav);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('app:navigation', onNav);
      // Restore originals
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, []);

  // Resolve legacy slug -> UUID via Supabase RPC (security definer).
  useEffect(() => {
    const resolve = async () => {
      if (!tenantSlug) {
        setTenantUuid(null);
        setTenantLoading(false);
        return;
      }
      // If tenantSlug already looks like a UUID, do not RPC
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(tenantSlug)) {
        setTenantLoading(false);
        return;
      }
      setTenantLoading(true);
      try {
        const sb = getSupabase(); // client without tenant header
        const { data, error } = await sb.rpc('get_tenant_uuid', { slug_in: tenantSlug });
        if (error) throw error;
        setTenantUuid((data as string) || null);
      } catch (e) {
        console.error('No se pudo resolver tenant UUID desde slug', e);
        setTenantUuid(null);
      } finally {
        setTenantLoading(false);
      }
    };
    resolve();
  }, [tenantSlug]);

  const resolveTenantFromLocation = () => tenantSlug; // compat: devuelve slug

  const value = useMemo(() => ({ tenant, setTenant, tenantSlug, tenantUuid, tenantLoading, resolveTenantFromLocation }), [tenant, tenantSlug, tenantUuid, tenantLoading]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
};

