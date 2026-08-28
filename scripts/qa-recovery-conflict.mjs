/**
 * CRI-140 · Recorrido real de dos pestañas contra la aplicación construida.
 *
 * No llama APIs internas de React: dos páginas comparten el mismo perfil de
 * Edge, alternan cambios de nombre y comprueban que la segunda edición acaba
 * como recuperación, no sobrescrita. Después restaura desde Home y verifica
 * que IndexedDB conserva el backup manual y resuelve el conflicto original.
 */
import { chromium } from 'playwright';
import { preview } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { disablePwaUpdateLifecycle, openExamplePortal, continueStoredProject } from './qa-welcome.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const previewServer = await preview({
  root: repoRoot,
  preview: { host: '127.0.0.1', port: 4194, strictPort: true },
  logLevel: 'error',
});
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
});
const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
disablePwaUpdateLifecycle(context);
const failures = [];
const check = (name, ok, detail) => {
  if (!ok) failures.push({ name, detail });
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${detail ? `  ${JSON.stringify(detail)}` : ''}`);
};

const summarizeLibrary = (library) => ({
  projects: library.projects.map((record) => ({ id: record.id, name: record.name, revision: record.revision })),
  recoveries: library.recoveries.map((record) => ({ id: record.id, reason: record.reason, name: record.project.name })),
});

const openWorkspace = async (page, stored = false) => {
  await page.goto('http://127.0.0.1:4194/', { waitUntil: 'networkidle' });
  if (stored) await continueStoredProject(page);
  else {
    await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 20_000 });
    await openExamplePortal(page);
    await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 20_000 });
  }
  await page.waitForTimeout(600);
};

const rename = async (page, name) => {
  await page.locator('.topbar-project-trigger').click();
  const input = page.getByRole('textbox', { name: /nombre del proyecto|project name/i });
  await input.fill(name);
  await input.press('Enter');
};

const readLibrary = (page) => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('structureCo.projects');
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const transaction = open.result.transaction(['projects', 'recoveries'], 'readonly');
    const projects = transaction.objectStore('projects').getAll();
    const recoveries = transaction.objectStore('recoveries').getAll();
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve({ projects: projects.result, recoveries: recoveries.result });
  };
}));

const waitForLibrary = async (page, predicate, timeout = 15_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const library = await readLibrary(page);
    if (predicate(library)) return library;
    await page.waitForTimeout(100);
  }
  throw new Error('La biblioteca no alcanzó el estado esperado.');
};

const openProjectsHome = async (page) => {
  await page.locator('.brand-home-button').click();
  await page.getByTestId('welcome-screen').waitFor({ state: 'visible', timeout: 15_000 });
  const desktopProjects = page.locator('.sc-home-sidebar .sc-home-nav button').nth(1);
  if (await desktopProjects.isVisible().catch(() => false)) {
    await desktopProjects.click();
  } else {
    await page.getByRole('button', { name: /abrir navegaci.n|open navigation/i }).click();
    await page.locator('.sc-home-nav--mobile button').nth(1).click();
  }
  await page.locator('.project-hub--full').waitFor({ state: 'visible', timeout: 15_000 });
};

try {
  const first = await context.newPage();
  await openWorkspace(first);
  let second = await context.newPage();
  await openWorkspace(second, true);

  // La primera pestaña guarda primero. La segunda cambia inmediatamente
  // después, aún con la revisión anterior, para ejercer el conflicto real.
  await rename(first, 'Edición guardada A');
  await second.waitForTimeout(80);
  await rename(second, 'Edición local B');

  await second.locator('[data-storage-state="conflict"]').waitFor({ state: 'visible', timeout: 20_000 });
  const afterConflict = await readLibrary(second);
  const conflict = afterConflict.recoveries.find((record) => record.reason === 'conflict');
  check('dos pestañas conservan la edición local como recuperación', Boolean(conflict && conflict.project.name === 'Edición local B'), summarizeLibrary(afterConflict));
  check('la revisión guardada no fue sobrescrita', afterConflict.projects.some((record) => record.project.name === 'Edición guardada A'), summarizeLibrary(afterConflict));

  // Simula el cierre del renderer sin eventos de descarga. Al abrir de nuevo,
  // la recuperación debe seguir siendo el único lugar de la edición local.
  await second.close({ runBeforeUnload: false });
  second = await context.newPage();
  await openWorkspace(second, true);
  const afterAbruptClose = await waitForLibrary(second, (library) => library.recoveries.some((record) => record.id === conflict?.id));
  check('cierre abrupto conserva la recuperación verificable',
    afterAbruptClose.recoveries.some((record) => record.id === conflict?.id && record.project.name === 'Edición local B'),
    summarizeLibrary(afterAbruptClose),
  );

  await openProjectsHome(second);
  await second.getByText(/conflicto de versiones|version conflict/i).waitFor({ state: 'visible', timeout: 15_000 });
  check('Home expone las dos versiones y una decisión explícita',
    await second.locator('[data-recovery-version="saved"]').isVisible()
      && await second.locator('[data-recovery-version="recovered"]').isVisible(),
  );
  await second.getByRole('button', { name: /ver edición en solo lectura|view read-only edit/i }).click();
  check('la otra versión se abre como geometría de solo lectura',
    await second.locator('[data-recovery-readonly] svg').isVisible()
      && await second.getByText(/esta vista no modifica ni guarda|this view does not modify or save/i).isVisible(),
  );
  const beforeDuplicate = afterAbruptClose.projects.length;
  await second.getByRole('button', { name: /duplicar ambas|duplicate both/i }).click();
  const afterDuplicate = await waitForLibrary(second, (library) => library.projects.length === beforeDuplicate + 2);
  check('duplicar ambas conserva las dos versiones antes de decidir',
    afterDuplicate.projects.some((record) => record.name === 'Copia de Edición guardada A')
      && afterDuplicate.projects.some((record) => record.name === 'Recuperación de Edición local B')
      && afterDuplicate.recoveries.some((record) => record.id === conflict?.id),
    summarizeLibrary(afterDuplicate),
  );

  second.once('dialog', (dialog) => dialog.accept());
  await second.getByRole('button', { name: /usar edición recuperada|use recovered edit/i }).click();
  await second.locator('.app-shell').waitFor({ state: 'visible', timeout: 15_000 });
  const afterRestore = await readLibrary(second);
  check('restaurar crea backup manual y resuelve el conflicto',
    afterRestore.projects.some((record) => record.project.name === 'Edición local B')
      && afterRestore.recoveries.some((record) => record.reason === 'manual' && record.project.name === 'Edición guardada A')
      && !afterRestore.recoveries.some((record) => record.id === conflict?.id),
    summarizeLibrary(afterRestore),
  );

  // La migración real toma el espejo compatible de localStorage, normaliza una
  // revisión histórica y la copia a IndexedDB sin requerir APIs internas.
  const sourceRaw = await second.evaluate(() => localStorage.getItem('structureCo.project'));
  if (!sourceRaw) throw new Error('No se encontró el espejo compatible para validar la migración.');
  const historical = JSON.parse(sourceRaw);
  historical.schemaVersion = 5;
  for (const member of historical.members ?? []) {
    delete member.materialId;
    delete member.materialOrigin;
    delete member.sectionId;
    delete member.sectionOrigin;
  }
  const migrationContext = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  disablePwaUpdateLifecycle(migrationContext);
  await migrationContext.addInitScript((serialized) => localStorage.setItem('structureCo.project', serialized), JSON.stringify(historical));
  const migrationPage = await migrationContext.newPage();
  await migrationPage.goto('http://127.0.0.1:4194/', { waitUntil: 'networkidle' });
  await continueStoredProject(migrationPage);
  const migrated = await waitForLibrary(migrationPage, (library) => library.projects.some((record) => record.id === historical.id));
  const migratedRecord = migrated.projects.find((record) => record.id === historical.id);
  check('migración IndexedDB normaliza y conserva el proyecto histórico',
    migratedRecord?.project.name === historical.name
      && migratedRecord.schemaVersion >= 6
      && !migrated.recoveries.some((record) => record.reason === 'migration'),
    summarizeLibrary(migrated),
  );
  await migrationContext.close();

  // En un perfil nuevo, el primer documento instala el shell; cerrarlo activa
  // el worker. El segundo documento queda controlado y debe reabrir el
  // proyecto desde el shell y la copia local sin red.
  const offlineContext = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  await offlineContext.addInitScript((serialized) => {
    if (localStorage.getItem('structureCo.project') === null) localStorage.setItem('structureCo.project', serialized);
  }, sourceRaw);
  const installer = await offlineContext.newPage();
  await openWorkspace(installer, true);
  await rename(installer, 'Proyecto disponible sin red');
  await waitForLibrary(installer, (library) => library.projects.some((record) => record.name === 'Proyecto disponible sin red'));
  await installer.close({ runBeforeUnload: false });
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto('http://127.0.0.1:4194/', { waitUntil: 'networkidle' });
  await offlinePage.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, { timeout: 20_000 });
  await continueStoredProject(offlinePage);
  await offlineContext.setOffline(true);
  await offlinePage.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
  await continueStoredProject(offlinePage);
  check('recarga offline conserva y abre el proyecto local',
    await offlinePage.locator('.topbar-project-trigger').textContent().then((name) => name?.includes('Proyecto disponible sin red') ?? false),
  );
  await offlineContext.setOffline(false);
  await offlineContext.close();
} finally {
  await context.close();
  await browser.close();
  await previewServer.close();
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log('Recovery conflict browser QA passed in chromium.');
}
