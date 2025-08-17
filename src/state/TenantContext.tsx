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

  // Parse slug from URL
  useEffect(() => {
    const [, slug] = window.location.pathname.split('/');
    setTenantSlug(slug || null);
  }, []);

  // Resolve slug -> UUID via Supabase RPC (security definer) then use UUID in X-Tenant-Id
  useEffect(() => {
    const resolve = async () => {
      if (!tenantSlug) {
        setTenantUuid(null);
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

