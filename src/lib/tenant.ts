import { getSupabase } from './supabase';

export type TenantCompanyDetails = {
  tenant_uuid: string;
  name: string | null;
  company_address: string | null;
  company_formatted_address: string | null;
  company_lat: number | null;
  company_lng: number | null;
};

export async function getTenantCompanyDetails(tenantUuid: string): Promise<TenantCompanyDetails | null> {
  const sb = getSupabase(tenantUuid);
  try {
    const { data, error } = await sb.rpc('get_tenant_company_details', { p_tenant: tenantUuid });
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) return data[0] as TenantCompanyDetails;
    if (data && !Array.isArray(data)) return data as TenantCompanyDetails;
    return null;
  } catch (e) {
    console.warn('[getTenantCompanyDetails] RPC failed, attempting direct select', e);
    try {
      const { data } = await sb
        .from('tenants')
        .select('uuid_id, name, company_address, company_formatted_address, company_lat, company_lng')
        .eq('uuid_id', tenantUuid)
        .single();
      if (!data) return null;
      return {
        tenant_uuid: (data as any).uuid_id,
        name: (data as any).name ?? null,
        company_address: (data as any).company_address ?? null,
        company_formatted_address: (data as any).company_formatted_address ?? null,
        company_lat: (data as any).company_lat ?? null,
        company_lng: (data as any).company_lng ?? null,
      } as TenantCompanyDetails;
    } catch {
      return null;
    }
  }
}

export async function updateTenantCompanyDetails(
  tenantUuid: string,
  input: {
    name?: string | null;
    company_address?: string | null;
    company_formatted_address?: string | null;
    company_lat?: number | null;
    company_lng?: number | null;
  }
): Promise<void> {
  const sb = getSupabase(tenantUuid);
  // Prefer RPC with security definer to bypass client-side RLS constraints for admins
  try {
    const { error } = await sb.rpc('update_tenant_company_details', {
      p_tenant: tenantUuid,
      p_name: input.name ?? null,
      p_company_address: input.company_address ?? null,
      p_company_formatted_address: input.company_formatted_address ?? null,
      p_company_lat: input.company_lat ?? null,
      p_company_lng: input.company_lng ?? null,
    });
    if (error) throw error;
    return;
  } catch (e) {
    console.warn('[updateTenantCompanyDetails] RPC failed, attempting direct update', e);
    // Fallback: direct update (may fail with RLS if user lacks Owner/Admin)
    const { error } = await sb
      .from('tenants')
      .update({
        name: input.name ?? undefined,
        company_address: input.company_address ?? null,
        company_formatted_address: input.company_formatted_address ?? null,
        company_lat: input.company_lat ?? null,
        company_lng: input.company_lng ?? null,
      })
      .eq('uuid_id', tenantUuid);
    if (error) throw error;
  }
}
