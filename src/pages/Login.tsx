import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const Login: React.FC = () => {
  const { tenant } = useParams();
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 px-4">
      <form
        className="w-full max-w-sm rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email inválido');
            if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
            await login(email, password);
            nav(`/${tenant}/app`);
          } catch (err: any) {
            setError(err?.message ?? 'No se pudo iniciar sesión');
          } finally {
            setLoading(false);
          }
        }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Iniciar sesión</h1>
          <p className="text-sm text-slate-500">Accede con tu correo y contraseña.</p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </div>
        )}

        <label className="block text-sm">
          Email
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tucorreo@dominio.com"
            className="mt-1 w-full rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Contraseña
          <div className="mt-1 relative">
            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pr-12 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 my-1 px-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={()=>setShowPwd((s)=>!s)}
              aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPwd ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
        </label>

        <button
          className="w-full rounded-xl bg-sky-600 py-2 text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="text-xs text-slate-500 text-center">¿Olvidaste tu contraseña? Próximamente.</p>
      </form>
    </div>
  );
};

export default Login;
