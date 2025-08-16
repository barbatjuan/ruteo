import { Workbox } from 'workbox-window';

export function registerSW() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const wb = new Workbox('/sw.js');
      wb.register();
    });
  }
}

export function useInstallPrompt() {
  let deferred: any = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
  });
  return {
    promptInstall: async () => {
      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice;
        deferred = null;
        return choice;
      }
      return null;
    },
  };
}
