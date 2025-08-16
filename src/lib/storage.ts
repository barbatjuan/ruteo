/* Storage helpers: namespaced by tenant */
export const storage = {
  local: {
    get: (key: string, tenant?: string) => {
      const k = tenant ? `tenant:${tenant}::${key}` : key;
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : null;
    },
    set: (key: string, value: unknown, tenant?: string) => {
      const k = tenant ? `tenant:${tenant}::${key}` : key;
      localStorage.setItem(k, JSON.stringify(value));
    },
    remove: (key: string, tenant?: string) => {
      const k = tenant ? `tenant:${tenant}::${key}` : key;
      localStorage.removeItem(k);
    },
  },
};
