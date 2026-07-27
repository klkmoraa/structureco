// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankProject } from '../data/defaultProject';
import { inspectPortableFile } from '../utils/portableFile';
import { createPortableImportCenterAdapter } from './portableImportAdapter';

vi.mock('../utils/portableFile', () => ({
  inspectPortableFile: vi.fn(),
}));

const inspectPortableFileMock = vi.mocked(inspectPortableFile);

describe('portableImportCenterAdapter presentation localization', () => {
  beforeEach(() => {
    inspectPortableFileMock.mockReset();
  });

  it('presents project inspection and completion feedback in English without changing project data', async () => {
    const project = createBlankProject();
    project.name = 'Bridge N-07';
    inspectPortableFileMock.mockResolvedValue({
      fileName: 'bridge.json',
      size: 1024,
      kind: 'project-json',
      canRestoreProject: true,
      project,
    });
    const adapter = createPortableImportCenterAdapter('en');
    const file = new File(['{}'], 'bridge.json', { type: 'application/json' });

    const inspection = await adapter.inspect(file);
    expect(inspection.sourceLabel).toBe('structureCo JSON project');
    expect(inspection.summary).toContain('Bridge N-07');
    expect(inspection.summary).toContain('validated');
    expect(inspection.statistics.map((item) => item.label)).toEqual(['Nodes', 'Members', 'Loads', 'Procedures']);
    expect(inspection.contents.map((item) => item.label)).toEqual([
      'Geometry and properties',
      'Supports and displacements',
      'Loads, cases and combinations',
      'Analysis results',
      'FBD and N–V–M diagrams',
      'Procedures and calculations',
      'Provenance and integrity',
    ]);
    expect(JSON.stringify(inspection)).not.toMatch(/Proyecto|Geometría|Miembros|Cargas|Procedimientos/);

    const outcome = await adapter.importFile(file, inspection, {
      mode: 'new',
      content: ['geometry', 'supports', 'loads'],
      saveCurrent: false,
    });
    expect(outcome.project.name).toBe('Bridge N-07');
    expect(outcome.title).toBe('Project imported');
    expect(outcome.message).toContain('run Analyze');
  });

  it('keeps the established Spanish presentation as the default adapter contract', async () => {
    const project = createBlankProject();
    project.name = 'Puente N-07';
    inspectPortableFileMock.mockResolvedValue({
      fileName: 'puente.json',
      size: 1024,
      kind: 'project-json',
      canRestoreProject: true,
      project,
    });
    const adapter = createPortableImportCenterAdapter('es');
    const inspection = await adapter.inspect(new File(['{}'], 'puente.json', { type: 'application/json' }));

    expect(inspection.sourceLabel).toBe('Proyecto structureCo JSON');
    expect(inspection.summary).toContain('Puente N-07');
    expect(inspection.contents[0]?.label).toBe('Geometría y propiedades');
  });

  it('localizes first-party reader errors at the presentation boundary', async () => {
    inspectPortableFileMock.mockRejectedValue(new Error('El archivo JSON no es valido.'));
    const adapter = createPortableImportCenterAdapter('en');

    await expect(adapter.inspect(new File(['{'], 'broken.json', { type: 'application/json' })))
      .rejects.toThrow('The JSON file is invalid.');
  });
});
