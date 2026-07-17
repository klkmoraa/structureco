// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../data/defaultProject';
import { ImportCenterDialog, type ImportCenterAdapter, type ImportInspection } from './ImportCenterDialog';

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
    window.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
  }
});

afterEach(() => cleanup());

const project = { ...createBlankProject(), name: 'Proyecto importado' };

const inspection: ImportInspection = {
  kind: 'json',
  sourceLabel: 'Proyecto structureCo JSON',
  version: String(project.schemaVersion),
  confidence: 100,
  supported: true,
  summary: 'Proyecto validado.',
  statistics: [{ label: 'Nodos', value: 0 }],
  warnings: [],
  contents: [
    { key: 'geometry', label: 'Geometría y propiedades', detail: '0 nodos', available: true, selectedByDefault: true },
    { key: 'loads', label: 'Cargas y combinaciones', detail: '0 cargas', available: true, selectedByDefault: true },
    { key: 'diagrams', label: 'DCL y diagramas N–V–M', detail: 'No incluidos', available: false },
  ],
  project,
};

const createAdapter = (): ImportCenterAdapter => ({
  inspect: vi.fn().mockResolvedValue(inspection),
  importFile: vi.fn().mockResolvedValue({ project, title: 'Proyecto listo', message: 'Importación terminada.', statistics: inspection.statistics }),
});

describe('ImportCenterDialog', () => {
  it('inspects, reviews and imports a file without browser alerts', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    const onImported = vi.fn();
    render(
      <ImportCenterDialog
        open
        currentProjectName="Proyecto actual"
        adapter={adapter}
        onClose={vi.fn()}
        onImported={onImported}
      />,
    );

    const file = new File(['{}'], 'modelo.structureco.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText(/seleccionar archivo para importar/i), file);

    expect(await screen.findByRole('heading', { name: /contenido encontrado/i })).toBeTruthy();
    expect(screen.getByText('modelo.structureco.json')).toBeTruthy();
    expect(screen.getByText(/100% confianza/i)).toBeTruthy();
    expect((screen.getByLabelText(/DCL y diagramas N–V–M/i) as HTMLInputElement).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByRole('radiogroup', { name: /destino de la importación/i })).toBeTruthy();
    expect((screen.getByRole('radio', { name: /combinar con el proyecto actual/i }) as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: /revisar importación/i }));
    expect(screen.getByRole('heading', { name: /confirma la importación/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /importar ahora/i }));

    expect(await screen.findByRole('heading', { name: /proyecto listo/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /abrir proyecto/i }));
    expect(onImported).toHaveBeenCalledWith(expect.objectContaining({ project }));
    expect(adapter.importFile).toHaveBeenCalledWith(file, inspection, expect.objectContaining({ mode: 'new', content: ['geometry', 'loads'] }));
  });

  it('supports drag and drop and reports inspection errors in the dialog', async () => {
    const adapter: ImportCenterAdapter = {
      inspect: vi.fn().mockRejectedValue(new Error('El archivo está dañado.')),
      importFile: vi.fn(),
    };
    const { container } = render(
      <ImportCenterDialog open currentProjectName="Actual" adapter={adapter} onClose={vi.fn()} onImported={vi.fn()} />,
    );
    const file = new File(['broken'], 'modelo.json', { type: 'application/json' });
    fireEvent.drop(container.querySelector('.import-dropzone')!, { dataTransfer: { files: [file] } });

    expect((await screen.findByRole('alert')).textContent).toContain('El archivo está dañado.');
    expect(screen.getByRole('heading', { name: /selecciona el expediente/i })).toBeTruthy();
  });

  it('requires explicit confirmation before saving and replacing the current project', async () => {
    const user = userEvent.setup();
    const adapter = createAdapter();
    const onSaveCurrent = vi.fn();
    render(
      <ImportCenterDialog
        open
        currentProjectName="Proyecto actual"
        adapter={adapter}
        onClose={vi.fn()}
        onImported={vi.fn()}
        onSaveCurrent={onSaveCurrent}
      />,
    );
    await user.upload(screen.getByLabelText(/seleccionar archivo para importar/i), new File(['{}'], 'modelo.json', { type: 'application/json' }));
    await screen.findByRole('heading', { name: /contenido encontrado/i });
    await user.click(screen.getByRole('button', { name: /continuar/i }));
    await user.click(screen.getByRole('radio', { name: /reemplazar el proyecto actual/i }));
    expect((screen.getByRole('checkbox', { name: /descargar una copia antes de reemplazar/i }) as HTMLInputElement).checked).toBe(true);
    expect(onSaveCurrent).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /revisar importación/i }));
    await user.click(screen.getByRole('button', { name: /importar ahora/i }));
    await waitFor(() => expect(onSaveCurrent).toHaveBeenCalledOnce());
    expect(adapter.importFile).toHaveBeenCalledWith(expect.any(File), inspection, expect.objectContaining({ mode: 'replace', saveCurrent: true }));
  });
});
