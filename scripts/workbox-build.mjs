import { generateSW } from 'workbox-build';

const tenantAwareCacheName = 'ruteo-cache-v1';

async function buildSW() {
  await generateSW({
    globDirectory: 'dist',
    globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
    swDest: 'dist/sw.js',
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: tenantAwareCacheName,
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
    ],
  });
  console.log('Service worker generated with Workbox');
}

buildSW();
