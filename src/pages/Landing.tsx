import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TopNav from '../components/TopNav';
import Pricing from '../components/Pricing';
import FAQ from '../components/FAQ';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';

const Landing: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      <TopNav 
        onLoginClick={() => setShowLogin(true)} 
        showNavLinks={false} 
        showThemeToggle={true}
      />
      
      <main className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-sky-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-sky-400/20 to-emerald-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Hero Section */}
        <section className="relative px-6 py-24 text-center">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Optimización inteligente de rutas
              </div>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-6xl md:text-7xl font-bold text-slate-900 dark:text-white mb-8 leading-tight"
            >
              Ruteo para
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600">
                negocios ágiles
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Optimiza entregas, ahorra tiempo y trabaja offline. 
              <br className="hidden md:block" />
              PWA multi-tenant con IA para rutas inteligentes.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <button 
                onClick={() => setShowSignup(true)}
                className="group px-8 py-4 bg-gradient-to-r from-emerald-600 to-sky-600 text-white rounded-2xl font-semibold hover:from-emerald-700 hover:to-sky-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <span className="flex items-center justify-center gap-2">
                  Crear empresa
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              <button 
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
              >
                Iniciar sesión
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
            >
              {[
                { value: '95%', label: 'Menos tiempo' },
                { value: '50k+', label: 'Rutas optimizadas' },
                { value: '24/7', label: 'Soporte' }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="relative px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-200/50 dark:border-slate-700/50"
            >
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                      Interfaz intuitiva
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                      Diseñada para equipos que necesitan resultados rápidos sin complicaciones.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { icon: '📊', title: 'Dashboard inteligente', desc: 'Vista completa de todas tus rutas y métricas' },
                      { icon: '🗺️', title: 'Mapas interactivos', desc: 'Visualización en tiempo real con optimización automática' },
                      { icon: '📱', title: 'PWA offline', desc: 'Funciona sin internet, sincroniza cuando vuelves' }
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        <span className="text-2xl">{feature.icon}</span>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{feature.title}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-sky-500/20 rounded-2xl blur-2xl"></div>
                  <div className="relative bg-slate-100 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm text-slate-500 ml-2">Ruteo Dashboard</span>
                    </div>
                    
                    <div className="aspect-video bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 dark:from-emerald-900/50 dark:via-sky-900/50 dark:to-indigo-900/50 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white text-2xl mb-4 mx-auto">
                          🗺️
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Vista previa interactiva</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing */}
        <section className="relative px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                Planes para cada negocio
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400">
                Desde startups hasta empresas, tenemos el plan perfecto para ti
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  name: 'Free', 
                  price: '$0', 
                  period: '/mes',
                  features: ['Hasta 50 paradas/mes', 'PWA offline', 'CSV básico', 'Soporte comunidad'],
                  popular: false
                },
                { 
                  name: 'Pro', 
                  price: '$19', 
                  period: '/mes',
                  features: ['10k paradas/mes', 'Historial y exportación', 'Soporte email', 'API access'],
                  popular: true
                },
                { 
                  name: 'Business', 
                  price: 'Contactar', 
                  period: '',
                  features: ['Ilimitado', 'SLA y SSO', 'Roles avanzados', 'Soporte dedicado'],
                  popular: false
                }
              ].map((plan, i) => (
                <motion.div 
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                  className={`relative bg-white dark:bg-slate-900 rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                    plan.popular 
                      ? 'border-emerald-500 shadow-lg' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-emerald-600 to-sky-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Más popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                      <span className="text-slate-500 ml-1">{plan.period}</span>
                    </div>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-slate-600 dark:text-slate-400">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <button 
                    onClick={() => plan.name === 'Business' ? null : setShowSignup(true)}
                    className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white hover:from-emerald-700 hover:to-sky-700 shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}>
                    {plan.name === 'Business' ? 'Contactar' : 'Comenzar'}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative px-6 py-12 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center text-white font-bold">
                  R
                </div>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">Ruteo</span>
              </div>
              
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                &copy; 2025 Ruteo. Todos los derechos reservados.
              </p>
              
              <div className="flex justify-center gap-8">
                <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Términos</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacidad</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Contacto</a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      <SignupModal open={showSignup} onClose={() => setShowSignup(false)} />
    </div>
  );
};

export default Landing;
