import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AppShell from '../components/AppShell';
import { useTenant } from '../state/TenantContext';
import { useToast } from '../state/ToastContext';
import { listTeamMembers, inviteTeamMember, updateMemberRole, removeMemberFromTeam, upsertTeamMemberName } from '../lib/supabaseClients';
import { Role } from '../state/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface TeamMember {
  user_id: string;
  email: string;
  name?: string;
  role: Role;
  created_at: string;
  status: 'active' | 'invited' | 'inactive';
}

const Team: React.FC = () => {
  const { tenantUuid, tenantLoading } = useTenant();
  const { success, error } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string>('');
  const [savingName, setSavingName] = useState<Record<string, boolean>>({});
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Driver');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadMembers = async () => {
    if (!tenantUuid) return;
    try {
      setLoading(true);
      const data = await listTeamMembers(tenantUuid);
      setMembers(data);
    } catch (e: any) {
      console.error('Error loading team members:', e);
      error('Error al cargar el equipo');
    } finally {
      setLoading(false);
    }
  };

  const startEditName = (m: TeamMember) => {
    setEditingName(m.user_id);
    setNameDraft(m.name || '');
  };

  const cancelEditName = () => {
    setEditingName(null);
    setNameDraft('');
  };

  const saveName = async (userId: string) => {
    if (!tenantUuid) return;
    try {
      setSavingName((s) => ({ ...s, [userId]: true }));
      await upsertTeamMemberName(tenantUuid, userId, nameDraft);
      success('Nombre actualizado');
      setEditingName(null);
      setNameDraft('');
      loadMembers();
    } catch (e: any) {
      console.error('Error updating name:', e);
      error('Error al actualizar nombre');
    } finally {
      setSavingName((s) => ({ ...s, [userId]: false }));
    }
  };

  useEffect(() => {
    loadMembers();
  }, [tenantUuid]);

  const handleInvite = async () => {
    if (!tenantUuid) return;
    if (!inviteEmail.trim()) {
      error('El email es obligatorio');
      return;
    }

    try {
      setInviteLoading(true);
      await inviteTeamMember({
        tenantUuid,
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
      });
      
      success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('Driver');
      setShowInviteForm(false);
      loadMembers();
    } catch (e: any) {
      console.error('Error inviting member:', e);
      error(e.message || 'Error al enviar invitación');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (!tenantUuid) return;
    try {
      await updateMemberRole(tenantUuid, userId, newRole);
      success('Rol actualizado');
      loadMembers();
    } catch (e: any) {
      console.error('Error updating role:', e);
      error('Error al actualizar rol');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!tenantUuid) return;
    if (!confirm(`¿Estás seguro de remover a ${memberName} del equipo?`)) return;
    
    try {
      await removeMemberFromTeam(tenantUuid, userId);
      success('Miembro removido del equipo');
      loadMembers();
    } catch (e: any) {
      console.error('Error removing member:', e);
      error('Error al remover miembro');
    }
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case 'Owner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Dispatcher': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Driver': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'invited': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'inactive': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!tenantUuid) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Tenant no encontrado
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            No se pudo identificar la empresa
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Gestión de equipo
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Administra los miembros de tu empresa y sus roles
            </p>
          </div>
          
          <Button
            variant="pillGreen"
            onClick={() => setShowInviteForm(true)}
          >
            Invitar miembro
          </Button>
        </div>

        {/* Invite Form Modal */}
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Invitar nuevo miembro
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="conductor@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Nombre
                  </label>
                  <Input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                    Rol
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as Role)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                  >
                    <option value="Driver">Driver - Conductor</option>
                    <option value="Dispatcher">Dispatcher - Despachador</option>
                    <option value="Admin">Admin - Administrador</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowInviteForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="pillGreen"
                  onClick={handleInvite}
                  disabled={inviteLoading}
                  className="flex-1"
                >
                  {inviteLoading ? 'Enviando...' : 'Enviar invitación'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Team Members List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No hay miembros en el equipo
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Invita a conductores y administradores para empezar
              </p>
              <Button
                variant="pillGreen"
                onClick={() => setShowInviteForm(true)}
              >
                Invitar primer miembro
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Miembro
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Rol
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {members.map((member) => (
                    <tr key={member.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar con iniciales */}
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-semibold">
                            {(member.name || member.email || 'S')[0]?.toUpperCase()}
                          </div>
                          {editingName === member.user_id ? (
                            <>
                              <input
                                className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-3 py-1.5 text-sm w-64"
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                placeholder="Nombre visible"
                              />
                              <button
                                onClick={() => saveName(member.user_id)}
                                disabled={savingName[member.user_id]}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 ml-2"
                                title="Guardar"
                              >
                                {savingName[member.user_id] ? (
                                  <span className="animate-pulse">…</span>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                )}
                              </button>
                              <button
                                onClick={cancelEditName}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 ml-1"
                                title="Cancelar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {member.name || 'Sin nombre'}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {member.email}
                                </div>
                              </div>
                              <button
                                onClick={() => startEditName(member)}
                                className="ml-2 inline-flex items-center px-2 py-1 rounded-md text-xs border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                              >
                                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Editar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                            {member.role}
                          </span>
                          {member.role !== 'Owner' && (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.user_id, e.target.value as Role)}
                              className="text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1"
                            >
                              <option value="Driver">Driver</option>
                              <option value="Dispatcher">Dispatcher</option>
                              <option value="Admin">Admin</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {member.status === 'active' ? 'Activo' : member.status === 'invited' ? 'Invitado' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {member.role !== 'Owner' && (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.user_id, e.target.value as Role)}
                                className="text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-2 py-1"
                              >
                                <option value="Driver">Driver</option>
                                <option value="Dispatcher">Dispatcher</option>
                                <option value="Admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                                title="Remover del equipo"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Team;
