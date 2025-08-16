import React from 'react';

const FAQ: React.FC = () => (
  <div className="grid md:grid-cols-2 gap-6">
    <div>
      <h3 className="font-semibold">¿Funciona offline?</h3>
      <p className="text-slate-600 dark:text-slate-300">Sí, gracias a nuestra PWA y caché de rutas.</p>
    </div>
    <div>
      <h3 className="font-semibold">¿Puedo importar CSV?</h3>
      <p className="text-slate-600 dark:text-slate-300">Sí, soportamos CSV de clientes y direcciones.</p>
    </div>
    <div>
      <h3 className="font-semibold">¿Multi-tenant?</h3>
      <p className="text-slate-600 dark:text-slate-300">Cada organización tiene su propio espacio y branding.</p>
    </div>
    <div>
      <h3 className="font-semibold">¿Exportación?</h3>
      <p className="text-slate-600 dark:text-slate-300">CSV y PDF con QR de la ruta.</p>
    </div>
  </div>
);

export default FAQ;
