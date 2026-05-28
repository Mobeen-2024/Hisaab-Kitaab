import { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register the PWA service worker automatically on boot
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New content is available; please refresh.');
  },
  onOfflineReady() {
    console.log('[PWA] App is ready for offline usage.');
  },
});

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

startTransition(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
