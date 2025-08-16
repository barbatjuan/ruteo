import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

const Login: React.FC = () => {
  const { tenant } = useParams();
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-900">
      <form
        className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await login(email, password);
          nav(`/${tenant}/app`);
        }}
      >
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <label className="block text-sm">Email
          <input className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">Contraseña
          <input type="password" className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </label>
        <button className="w-full rounded-xl bg-sky-600 py-2 text-white hover:bg-sky-700">Entrar</button>
      </form>
    </div>
  );
};

export default Login;
