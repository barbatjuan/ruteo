import { getSupabase } from './supabase';

export type UserRole = 'Owner' | 'Admin' | 'Dispatcher' | 'Driver' | null;

/**
 * Obtiene el rol del usuario actual en el tenant especificado
 * @param tenantUuid UUID del tenant
 * @returns Rol del usuario o null si no tiene rol en el tenant
 */
export async function getCurrentUserRole(tenantUuid: string): Promise<UserRole> {
  const sb = getSupabase(tenantUuid);
  
  // Verificar si el usuario está autenticado
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  
  // Consultar el rol del usuario en el tenant
  const { data, error } = await sb
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_uuid', tenantUuid)
    .eq('user_id', session.user.id)
    .single();
  
  if (error || !data) return null;
  return data.role as UserRole;
}

/**
 * Verifica si el usuario actual tiene uno de los roles especificados
 * @param tenantUuid UUID del tenant
 * @param allowedRoles Lista de roles permitidos
 * @returns true si el usuario tiene uno de los roles permitidos
 */
export async function hasRole(tenantUuid: string, allowedRoles: UserRole[]): Promise<boolean> {
  const role = await getCurrentUserRole(tenantUuid);
  return role !== null && allowedRoles.includes(role);
}

/**
 * Verifica si el usuario actual es administrador (Owner o Admin)
 * @param tenantUuid UUID del tenant
 * @returns true si el usuario es Owner o Admin
 */
export async function isAdmin(tenantUuid: string): Promise<boolean> {
  return hasRole(tenantUuid, ['Owner', 'Admin']);
}
