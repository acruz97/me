import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// The production build pre-renders the page into index.html (see scripts/prerender.mjs)
// so search engines and ATS scrapers see real content; React then hydrates it.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
