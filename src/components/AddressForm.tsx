import React, { useState } from 'react';
import { parseSimpleCSV } from '../lib/csv';
import { useToast } from '../state/ToastContext';
import Loader from './Loader';

const AddressForm: React.FC = () => {
  const [input, setInput] = useState('');
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const add = () => {
    if (!input || input.trim().length < 3) {
      setErrors('La dirección debe tener al menos 3 caracteres');
      error('Dirección inválida');
      return;
    }
    setErrors(null);
    // TODO: push to state/store and map
    setInput('');
    success('Dirección agregada');
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
      <h2 className="font-semibold mb-2">Direcciones rápidas</h2>
      <div className="flex gap-2">
        <input
          aria-label="Nueva dirección"
          className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Calle 123, Ciudad"
        />
        <button className="rounded-xl bg-sky-600 text-white px-4" onClick={add}>Agregar</button>
      </div>
      {errors && <p role="alert" className="mt-2 text-sm text-red-600">{errors}</p>}
      <div className="mt-4">
        <label className="block text-sm font-medium">Importar CSV</label>
        <input
          type="file"
          accept=".csv"
          className="mt-1 block w-full text-sm"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setLoading(true);
              const text = await file.text();
              const rows = await parseSimpleCSV(text);
              success(`CSV importado: ${rows.length} filas`);
            } catch (err) {
              console.error(err);
              error('Error al importar CSV');
            } finally {
              setLoading(false);
            }
          }}
        />
      </div>
      {loading && <Loader label="Procesando CSV…" />}
      <button className="mt-4 w-full rounded-xl bg-emerald-600 text-white py-2">Calcular ruta óptima</button>
    </div>
  );
};

export default AddressForm;
