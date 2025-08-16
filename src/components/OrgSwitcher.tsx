import React, { useState } from 'react';

const OrgSwitcher: React.FC = () => {
  const [org, setOrg] = useState('acme');
  return (
    <select aria-label="Seleccionar organización" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent px-2 py-1" value={org} onChange={(e)=>setOrg(e.target.value)}>
      <option value="acme">Acme</option>
      <option value="globex">Globex</option>
    </select>
  );
};

export default OrgSwitcher;
