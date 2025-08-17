import React from 'react';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';

const ExportButtons: React.FC = () => {
  const exportCSV = () => {
    const rows = [
      ['order', 'lat', 'lng', 'address', 'label', 'clientId', 'eta'],
      ['1', '40.4168', '-3.7038', 'Calle 1', 'A', 'c1', '5'],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ruta.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    doc.text('Ruteo - Plan de ruta', 14, 16);
    const qrData = await QRCode.toDataURL(window.location.href);
    doc.addImage(qrData, 'PNG', 160, 6, 40, 40);
    doc.text('1. Calle 1 (ETA 5m)', 14, 30);
    doc.save('ruta.pdf');
  };

  return (
    <div className="flex gap-2">
      <button className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1" onClick={exportCSV}>Export CSV</button>
      <button className="rounded-xl bg-emerald-600 text-white px-3 py-1" onClick={exportPDF}>Export PDF</button>
    </div>
  );
};

export default ExportButtons;
