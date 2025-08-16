import React from 'react';

const Footer: React.FC = () => (
  <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-sm text-slate-500">
    <p>© {new Date().getFullYear()} Ruteo. Todos los derechos reservados.</p>
    <div className="mt-2 space-x-4">
      <a href="#" className="hover:underline">Términos</a>
      <a href="#" className="hover:underline">Privacidad</a>
      <a href="#" className="hover:underline">Contacto</a>
    </div>
  </footer>
);

export default Footer;
