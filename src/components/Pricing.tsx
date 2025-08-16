import React from 'react';

const tiers = [
  { name: 'Free', price: '$0', features: ['Hasta 50 paradas/mes', 'PWA offline', 'CSV básico'] },
  { name: 'Pro', price: '$19', features: ['10k paradas/mes', 'Historial y exportación', 'Soporte email'] },
  { name: 'Business', price: 'Contactar', features: ['Ilimitado', 'SLA y SSO', 'Roles avanzados'] },
];

const Pricing: React.FC = () => (
  <div className="grid md:grid-cols-3 gap-6">
    {tiers.map((t) => (
      <div key={t.name} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900">
        <h3 className="text-xl font-bold">{t.name}</h3>
        <p className="mt-2 text-3xl font-extrabold">{t.price}</p>
        <ul className="mt-4 space-y-2 text-slate-600 dark:text-slate-300">
          {t.features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
        <button className="mt-6 w-full rounded-xl bg-sky-600 py-2 text-white hover:bg-sky-700">Elegir</button>
      </div>
    ))}
  </div>
);

export default Pricing;
