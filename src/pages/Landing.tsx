import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopNav from '../components/TopNav';
import Pricing from '../components/Pricing';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';
import MapView from '../components/MapView';
import LoginModal from '../components/LoginModal';

const Landing: React.FC = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100">
      <TopNav onLoginClick={() => setLoginOpen(true)} showNavLinks={false} showThemeToggle={false} />
      <header className="max-w-7xl mx-auto px-6 pt-16 pb-10 text-center">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Ruteo — Planificador de rutas para negocios ágiles
        </motion.h1>
        <p className="mt-4 text-lg md:text-xl text-slate-600 dark:text-slate-300">
          Optimiza entregas, ahorra tiempo y trabaja offline con nuestra PWA multi-tenant.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/acme/app" className="rounded-xl bg-sky-600 px-6 py-3 text-white shadow-soft hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500">
            Probar demo
          </Link>
          <a href="#pricing" className="rounded-xl px-6 py-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">Ver planes</a>
        </div>
        <div className="mt-12 grid md:grid-cols-2 gap-8 items-center">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <MapView height="320px" />
            </div>
          </div>
          <div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-slate-500">macOS style tabs</span>
              </div>
              <div className="flex gap-3 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                <button className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">Importar CSV</button>
                <button className="px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Optimizar</button>
                <button className="px-3 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Exportar</button>
              </div>
              <ul className="space-y-2 text-left text-sm">
                <li>• CSV o manual → Optimiza → Exporta</li>
                <li>• PWA offline y cache de rutas</li>
                <li>• Multi-tenant y roles</li>
              </ul>
            </div>
          </div>
        </div>
      </header>
      <section className="max-w-7xl mx-auto px-6 mt-8" id="pricing">
        <Pricing />
      </section>
      <section className="max-w-7xl mx-auto px-6 mt-8">
        <FAQ />
      </section>
      <Footer />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
};

export default Landing;
