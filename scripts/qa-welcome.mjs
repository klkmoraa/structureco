/**
 * Navegación compartida por la bienvenida para los QA de Playwright.
 *
 * La Home actual concentra la navegación real en el menú lateral de escritorio
 * y en el menú desplegable de móvil. Los QA que consumen plantillas o ejemplos
 * deben llegar primero a esa superficie, en vez de asumir controles del prototipo
 * anterior. La navegación queda aquí para que todos los guiones utilicen la
 * misma ruta de producto.
 */

/**
 * Borra la biblioteca ANTES de que arranque el código de la aplicación.
 *
 * CRI-104 · con la biblioteca poblada el producto salta directo a la Mesa ~1,5s
 * después del primer pintado, desmontando la bienvenida bajo el clic del QA.
 * Limpiar `localStorage` no lo evita: la biblioteca vive en IndexedDB. Y borrarla
 * desde la página ya cargada tampoco es fiable — un `deleteDatabase` lanzado
 * cuando la app ya abrió la base queda `blocked` y no borra nada. Como
 * `addInitScript`, esto corre en cada documento antes que la app, así que nunca
 * compite con ella.
 */
export const clearProjectLibraryOnBoot = (target) => target.addInitScript(() => {
  try { indexedDB.deleteDatabase('structureCo.projects'); } catch { /* noop */ }
});

/**
 * Los runners contra `vite preview` sirven el build de producción, por lo que
 * `PwaUpdateNotice` intenta registrar `sw.js`. Si un service worker anterior
 * detecta el build nuevo, puede recargar la página durante una comprobación y
 * volver a ejecutar la siembra `__structurecoQaProject`, borrando el proyecto
 * recién abierto. Los gates necesitan aislar esa actualización externa del
 * recorrido funcional que están midiendo.
 */
export const disablePwaUpdateLifecycle = (target) => target.addInitScript(() => {
  const registration = {
    installing: null,
    waiting: null,
    addEventListener: () => undefined,
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller: null,
      register: async () => registration,
      addEventListener: () => undefined,
    },
  });
});

/**
 * Abre la biblioteca de Plantillas desde la navegación real de la portada.
 *
 * La portada vigente concentra las plantillas en la navegación de Home. Los
 * QA deben seguir la navegación que ve una persona: en escritorio se usa la
 * barra lateral y en móvil se abre primero el menú.
 */
export const openWelcomeStep = async (page, name) => {
  if (name !== 'Por dónde' && name !== 'Cómo trabajas') throw new Error(`Paso de bienvenida desconocido: ${name}`);
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible' });
  const sidebarTemplates = page.locator('.sc-home-sidebar .sc-home-nav button').nth(2);
  if (await sidebarTemplates.isVisible().catch(() => false)) {
    await sidebarTemplates.click();
  } else {
    const menu = page.getByRole('button', { name: /abrir navegación|open navigation/i }).first();
    await menu.click({ timeout: 5_000 });
    await page.locator('.sc-home-nav--mobile button').nth(2).click({ timeout: 5_000 });
  }
  await page.locator('.sc-home-template-grid').waitFor({ state: 'visible', timeout: 10_000 });
};

/**
 * Abre el pórtico de ejemplo desde donde vive hoy. Devuelve el localizador ya
 * pulsado para que cada script siga esperando lo que le importe de la Mesa.
 */
export const openExamplePortal = async (page, locator) => {
  await openWelcomeStep(page, 'Por dónde');
  const card = locator && await locator.count() && await locator.isVisible().catch(() => false)
    ? locator
    : page.locator('.sc-home-template-grid > button').filter({ hasText: /p.rtico de ejemplo|example frame/i }).first();
  await card.waitFor({ state: 'visible' });
  await card.click({ force: true });
  return card;
};

/**
 * Llega a la Mesa con el proyecto que ya está en almacenamiento.
 *
 * CRI-104 · con un proyecto guardado el producto a veces entra SOLO y a veces
 * pinta la bienvenida con «Continuar proyecto». Las dos son la ruta real del
 * usuario, así que se acepta la que ocurra; lo que no se acepta es entrar por
 * otro sitio. Esperar la bienvenida a secas —lo que hacían estos QA— falla
 * justo en el caso normal, que es el salto directo.
 */
export const continueStoredProject = async (page, { timeout = 20_000 } = {}) => {
  const shell = page.locator('.app-shell');
  if (await shell.waitFor({ state: 'visible', timeout }).then(() => true, () => false)) return;
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /continuar proyecto/i }).click();
  await shell.waitFor({ state: 'visible' });
};

/**
 * Abre la superficie de Resultados igual que lo haría una persona.
 *
 * Analizar YA NO abre el panel por su cuenta: desde que las salidas son una
 * superficie invocada (`broker.isRetained('results')` en `WorkspaceShell`), el
 * análisis pinta el lienzo y deja el panel cerrado hasta que alguien lo pide.
 * Los QA que daban por hecho «pulsar Analizar ⇒ ver el diagrama» esperaban un
 * panel que nadie había abierto. Se pulsa el lanzador real; el evento de
 * comando queda de reserva para los viewports donde el lanzador se repliega.
 */
export const openResultsSurface = async (page, { timeout = 15_000 } = {}) => {
  const panel = page.locator('.results-panel');
  if (await panel.isVisible().catch(() => false)) return panel;

  const resultCommand = page.locator('[data-workspace-surface-command="open-results"]').last();
  if (!await resultCommand.isVisible().catch(() => false)) {
    const desktopLauncher = page.locator('.desktop-tool-list [data-workspace-panels-launcher]').first();
    if (await desktopLauncher.isVisible().catch(() => false)) {
      await desktopLauncher.locator('button').first().click();
    } else {
      const more = page.locator('.mobile-tool-dock').getByRole('button', { name: /^Más herramientas$|^More tools$/i }).first();
      await more.click({ timeout: 5_000 });
      const workspaceLauncher = page.locator('.mobile-tool-palette-more [data-workspace-panels-launcher]');
      await workspaceLauncher.waitFor({ state: 'visible', timeout: 5_000 });
      await workspaceLauncher.click({ timeout: 5_000 });
      const workspacePalette = page.locator('.mobile-tool-palette-workspace');
      await workspacePalette.waitFor({ state: 'visible', timeout: 5_000 });
      await workspacePalette.getByRole('menuitem', { name: /^Resultados$|^Results$/i }).click({ timeout: 5_000 });
    }
  }
  if (await panel.isVisible().catch(() => false)) return panel;
  await resultCommand.waitFor({ state: 'visible', timeout });
  await resultCommand.click();
  await panel.waitFor({ state: 'visible', timeout });
  if ((await panel.getAttribute('class'))?.includes('mobile-collapsed')) {
    await panel.locator('.results-mobile-toggle').click({ timeout: 8_000 });
  }
  return panel;
};
