import React from 'react';

const StopsList: React.FC = () => {
  const mockStops = [
    { id: 1, address: 'Av. Siempreviva 742', selected: false },
    { id: 2, address: 'Calle Falsa 123', selected: true },
  ];
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <h2 className="font-semibold mb-2">Paradas</h2>
      <ul className="space-y-1">
        {mockStops.map((s) => (
          <li key={s.id} className={`px-3 py-2 rounded-lg ${s.selected ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>{s.id}. {s.address}</li>
        ))}
      </ul>
      <button className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">Recalcular</button>
    </div>
  );
};

export default StopsList;
