import { renderToString } from 'react-dom/server';
import App from './App';

/** Renders the page to static HTML at build time (used by scripts/prerender.mjs). */
export function render(): string {
  return renderToString(<App />);
}
