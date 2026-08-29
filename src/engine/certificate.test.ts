import { describe, expect, it } from 'vitest';
import { createDefaultProject } from '../data/defaultProject';
import { certifyResult } from './certificate';

describe('certificado numérico', () => {
  it('emite las cuatro lecturas independientes para un modelo resuelto', () => {
    const certificate = certifyResult(createDefaultProject());
    expect(certificate.checks.map((check) => check.id).sort()).toEqual([
      'global-equilibrium', 'h-refinement', 'linearity', 'maxwell-betti',
    ]);
    expect(certificate.extraSolves).toBe(4);
    expect(certificate.checks.find((check) => check.id === 'global-equilibrium')?.status).toBe('passed');
  });

  it('permite omitir lecturas costosas sin alterar el modelo de origen', () => {
    const project = createDefaultProject();
    const before = JSON.stringify(project);
    const certificate = certifyResult(project, null, { skip: ['linearity', 'maxwell-betti', 'h-refinement'] });
    expect(certificate.checks.map((check) => check.id)).toEqual(['global-equilibrium']);
    expect(certificate.extraSolves).toBe(0);
    expect(JSON.stringify(project)).toBe(before);
  });

  it('no presenta comprobaciones de primer orden como válidas para P-Delta', () => {
    const project = createDefaultProject();
    project.settings.analysisMode = 'p-delta';
    const certificate = certifyResult(project);
    expect(certificate).toMatchObject({ verdict: 'not-verifiable', checks: [], extraSolves: 0 });
  });
});
