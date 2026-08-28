import { describe, expect, it } from 'vitest';
import type { ModelDoctorFinding } from './modelDoctorDiagnostics';
import { presentModelDoctorFinding } from './modelDoctorPresentation';

const finding = (sourceIssueId: string, category: ModelDoctorFinding['category'], objectId?: string): ModelDoctorFinding => ({
  id: sourceIssueId,
  sourceIssueId,
  severity: 'warning',
  category,
  title: 'Título original',
  explanation: 'Explicación original',
  whyItMatters: 'Importancia original',
  affectedObjects: objectId ? [{ kind: 'node', id: objectId }] : [],
  suggestedAction: 'Acción original',
  target: null,
  repair: null,
  canLocate: Boolean(objectId),
  canAcknowledge: true,
});

describe('presentModelDoctorFinding', () => {
  it('explains an invalid node coordinate specifically in English', () => {
    expect(presentModelDoctorFinding(finding('node-coordinate-N4', 'geometry', 'N4'), 'en')).toMatchObject({
      title: 'Invalid node coordinate',
      explanation: expect.stringMatching(/N4.*not a finite number/i),
    });
  });

  it('explains the Classroom relative-stiffness warning specifically in English', () => {
    expect(presentModelDoctorFinding(finding('classroom-relative-stiffness', 'configuration'), 'en')).toMatchObject({
      title: 'Indeterminate exercise in Classroom mode',
      explanation: expect.stringMatching(/redundanc.*automatic stiffness.*Classroom mode/i),
    });
  });

  it('does not describe an invalid combination factor as a broken reference', () => {
    const presented = presentModelDoctorFinding(finding('combination-factor-ULS-LC1', 'configuration'), 'en');
    expect(presented).toMatchObject({
      title: 'Invalid load-combination factor',
      explanation: expect.stringMatching(/factor.*not a finite number/i),
    });
    expect(presented.explanation).not.toMatch(/does not exist|broken reference/i);
  });

  it('explains a non-finite prescribed displacement specifically in English', () => {
    expect(presentModelDoctorFinding(finding('prescribed-N4-ux', 'supports', 'N4'), 'en')).toMatchObject({
      title: 'Invalid prescribed displacement',
      explanation: expect.stringMatching(/N4.*not a finite number/i),
    });
  });

  it('distinguishes missing supports from an incompatible or disconnected support and offers a guided repair', () => {
    const presented = presentModelDoctorFinding(finding('no-supports', 'supports'), 'en');
    expect(presented).toMatchObject({
      title: 'The model has no supports',
      explanation: expect.stringMatching(/no node has a support restraint/i),
      suggestedAction: expect.stringMatching(/will not choose their type or position automatically/i),
      contextualRepair: {
        tool: 'support',
        actionLabel: 'Add supports',
        beginLabel: 'Open Support tool',
      },
    });
    expect(presented.explanation).not.toMatch(/incompatible|disconnected/i);
  });

  it('uses the same precise cause and a non-automatic support route in Spanish', () => {
    const presented = presentModelDoctorFinding(finding('no-supports', 'supports'), 'es');
    expect(presented).toMatchObject({
      title: 'El modelo no tiene apoyos',
      explanation: expect.stringMatching(/ningún nudo tiene una restricción de apoyo/i),
      contextualRepair: {
        tool: 'support',
        actionLabel: 'Añadir apoyos',
      },
    });
    expect(presented.suggestedAction).toMatch(/no elegirá su tipo ni su posición automáticamente/i);
  });
});
