import React, { createContext, useContext, useMemo, useState } from 'react';

export type Tenant = { id: string; name: string; plan: 'Free' | 'Pro' | 'Business' };

type TenantContextType = {
  tenant: Tenant | null;
  setTenant: (t: Tenant | null) => void;
  resolveTenantFromLocation: () => string | null;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const resolveTenantFromLocation = () => {
    const [, slug] = window.location.pathname.split('/');
    return slug || null;
  };

  const value = useMemo(() => ({ tenant, setTenant, resolveTenantFromLocation }), [tenant]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
};
