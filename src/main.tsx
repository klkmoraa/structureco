import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
const render = (content: ReactNode) => root.render(<StrictMode>{content}</StrictMode>);

if (import.meta.env.DEV && window.location.pathname === '/__components') {
  void import('./design-system/lab/ComponentLab').then(({ ComponentLab }) => render(<ComponentLab />));
} else {
  render(<App />);
}
