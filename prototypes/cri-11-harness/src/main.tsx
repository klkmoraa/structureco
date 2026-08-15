import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Los tokens y los componentes `sc-*` se IMPORTAN de producción, no se copian.
 * El Brandbook es la autoridad de identidad y duplicar la paleta crearía un
 * sistema visual paralelo — exactamente lo que CRI-10 y CRI-11 prohíben. Estos
 * dos archivos se leen sin modificarse; el prototipo no escribe en `src/**`.
 */
import '../../../src/design-system/tokens.css';
import '../../../src/design-system/components/ui.css';

import './harness/harness.css';
import './app/prototype.css';

import { PrototypeProvider, usePrototype } from './state/PrototypeStore';
import { HarnessShell } from './harness/HarnessShell';
import { Welcome } from './app/Welcome';
import { Workspace } from './app/Workspace';

const Prototype = () => {
  const { state } = usePrototype();
  return state.screen === 'welcome' ? <Welcome /> : <Workspace />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrototypeProvider>
      <HarnessShell>
        <Prototype />
      </HarnessShell>
    </PrototypeProvider>
  </StrictMode>,
);
