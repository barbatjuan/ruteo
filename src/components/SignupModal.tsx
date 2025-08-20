import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { createTenantAndOwner } from '../lib/supabaseClients';

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState<'company' | 'owner' | 'success'>('company');
  const [loading, setLoading] = useState(false);
  const { signup, login } = useAuth();
  const { success, error } = useToast();

  // Company data
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [plan, setPlan] = useState<'Free' | 'Pro' | 'Business'>('Free');

  // Owner data
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleCompanyNext = () => {
    if (!companyName.trim()) {
      error('El nombre de la empresa es obligatorio');
      return;
    }
    if (!companySlug.trim()) {
      error('El identificador de la empresa es obligatorio');
      return;
    }
    if (companySlug.length < 3) {
      error('El identificador debe tener al menos 3 caracteres');
      return;
    }
    setStep('owner');
  };

  const handleSignup = async () => {
    if (!ownerName.trim() || !ownerEmail.trim() || !ownerPassword.trim()) {
      error('Todos los campos son obligatorios');
      return;
    }
    if (ownerPassword !== confirmPassword) {
      error('Las contraseñas no coinciden');
      return;
    }
    if (ownerPassword.length < 6) {
      error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      
      // Create tenant and owner user
      const result = await createTenantAndOwner({
        companyName: companyName.trim(),
        companySlug: companySlug.trim(),
        plan,
        ownerName: ownerName.trim(),
        ownerEmail: ownerEmail.trim(),
        ownerPassword: ownerPassword.trim(),
      });

      if (result.success) {
        setStep('success');
        success('¡Empresa creada exitosamente!');
        
        // Auto login after 2 seconds
        setTimeout(async () => {
          try {
            await login(ownerEmail.trim(), ownerPassword.trim());
            onClose();
            // Redirect to company dashboard
            window.location.href = `/${companySlug.trim()}`;
          } catch (e) {
            console.error('Auto-login failed:', e);
            error('Empresa creada, pero hubo un error al iniciar sesión. Intenta hacer login manualmente.');
          }
        }, 2000);
      } else {
        error(result.error || 'Error al crear la empresa');
      }
    } catch (e: any) {
      console.error('Signup error:', e);
      error(e.message || 'Error al crear la empresa');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('company');
    setCompanyName('');
    setCompanySlug('');
    setPlan('Free');
    setOwnerName('');
    setOwnerEmail('');
    setOwnerPassword('');
    setConfirmPassword('');
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {step === 'company' && 'Crear empresa'}
                  {step === 'owner' && 'Datos del administrador'}
                  {step === 'success' && '¡Bienvenido!'}
                </h2>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {step === 'company' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Nombre de la empresa
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setCompanySlug(generateSlug(e.target.value));
                      }}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2"
                      placeholder="Mi Empresa SRL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Identificador único
                    </label>
                    <input
                      type="text"
                      value={companySlug}
                      onChange={(e) => setCompanySlug(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2"
                      placeholder="mi-empresa"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Tu URL será: ruteo.app/{companySlug}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Plan
                    </label>
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                    >
                      <option value="Free">Free - Hasta 50 paradas/mes</option>
                      <option value="Pro">Pro - 10k paradas/mes ($19/mes)</option>
                      <option value="Business">Business - Ilimitado (Contactar)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleCompanyNext}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-sky-700 transition-all duration-300"
                  >
                    Continuar
                  </button>
                </div>
              )}

              {step === 'owner' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2"
                      placeholder="Juan Pérez"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2"
                      placeholder="juan@miempresa.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                      Confirmar contraseña
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 px-3 py-2"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('company')}
                      className="flex-1 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleSignup}
                      disabled={loading}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-sky-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creando...' : 'Crear empresa'}
                    </button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
                    ✓
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Tu empresa <strong>{companyName}</strong> ha sido creada exitosamente.
                  </p>
                  <p className="text-sm text-slate-500">
                    Redirigiendo al dashboard...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SignupModal;
