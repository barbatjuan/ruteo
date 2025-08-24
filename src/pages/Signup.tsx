import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../state/ToastContext';
import { createTenantAndOwner } from '../lib/supabaseClients';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [plan, setPlan] = useState<'Free' | 'Pro' | 'Business'>('Free');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !companySlug.trim() || !ownerEmail.trim() || !ownerPassword) {
      error('Completa los campos obligatorios');
      return;
    }
    setLoading(true);
    try {
      const res = await createTenantAndOwner({
        companyName: companyName.trim(),
        companySlug: companySlug.trim().toLowerCase(),
        plan,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerPassword,
      });
      if (!res.success) {
        error(res.error || 'No se pudo crear la empresa');
        return;
      }
      success('Empresa creada con éxito');
      const uuid = (res.tenant as any)?.uuid_id || (res.tenant as any)?.id || null;
      if (uuid) navigate(`/${uuid}/app`);
      else navigate('/');
    } catch (e: any) {
      error(e?.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Crea tu empresa</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Regístrate y comienza a planificar rutas</p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Nombre de la empresa *</label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ACME Logistics" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Identificador (slug) *</label>
            <Input value={companySlug} onChange={(e) => setCompanySlug(e.target.value)} placeholder="acme" />
            <p className="text-xs text-slate-500 mt-1">Se usará en la URL. Ej: /acme o su UUID.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value as any)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2">
              <option value="Free">Free</option>
              <option value="Pro">Pro</option>
              <option value="Business">Business</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Tu nombre</label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Email *</label>
              <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="juan@acme.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Contraseña *</label>
            <Input type="password" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/')}>Cancelar</Button>
            <Button type="submit" variant="pillGreen" disabled={loading} className="flex-1">
              {loading ? 'Creando…' : 'Crear empresa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
