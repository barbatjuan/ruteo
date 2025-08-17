import React, { useState } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { useNavigate } from 'react-router-dom';

const LoginModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { login } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await login(email, password);
      success('Sesión iniciada');
      onClose();
      // Derivar slug del path actual; si no hay, usar 'acme'
      const pathParts = window.location.pathname.split('/');
      const slug = pathParts[1] || 'acme';
      navigate(`/${slug}/app`, { replace: true });
    } catch (e: any) {
      console.error(e);
      error(e?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Iniciar sesión">
      <form onSubmit={onSubmit} className="p-6 grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-300">Email</span>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@email.com" />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-slate-600 dark:text-slate-300">Contraseña</span>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
        </label>
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default LoginModal;
