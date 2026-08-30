/**
 * Calculation sheets organised exactly where the solver changes expression: one free body and
 * one set of N/V/M equations for every member segment.  A global result curve is useful as a
 * summary, but it cannot replace the cut that explains why a polynomial applies on a given
 * interval.
 */
import { evaluateSegment } from '../../engine/diagram';
import { memberAxis } from '../../graphics/structureGeometry';
import { clearDisplay, display, formatPolynomial, quantityUnit, unitFor } from './pdfFormat';
import { drawFreeBodyScene, type FreeBodyScene } from './pdfFreeBody';
import type { AnalysisResult } from '../../types';
import type { ReportContext } from './reportContext';

type MemberResult = AnalysisResult['memberResults'][number];
type Segment = MemberResult['diagramSegments'][number];

const clamp = (value: number, lower: number, upper: number): number => Math.max(lower, Math.min(upper, value));

const segmentScene = (
  context: ReportContext,
  result: MemberResult,
  segment: Segment,
  segmentNumber: number,
): FreeBodyScene | undefined => {
  const { project, index } = context;
  const member = index.member(result.memberId);
  const ni = member ? index.node(member.i) : undefined;
  const nj = member ? index.node(member.j) : undefined;
  if (!member || !ni || !nj) return undefined;

  const axis = memberAxis(member, ni, nj);
  if (!(axis.length > 0)) return undefined;
  const station = (segment.x0 + segment.x1) / 2;
  const startOffset = result.startOffset ?? member.rigidOffsetI ?? 0;
  const ratio = clamp((startOffset + station) / axis.length, 0.04, 0.96);
  const at = { x: ni.x + (nj.x - ni.x) * ratio, y: ni.y + (nj.y - ni.y) * ratio };
  const cutSize = Math.max(axis.length * 0.08, 0.35);
  const values = evaluateSegment(segment, station);
  const sign = (value: number) => value >= 0 ? 1 : -1;
  const forceReference = Math.max(Math.abs(values.axial), Math.abs(values.shear), 1e-12);
  const momentReference = Math.max(Math.abs(values.moment), 1e-12);

  return {
    title: `barra ${member.id} · tramo ${segmentNumber} · corte en s`,
    keptMemberIds: [member.id],
    keptNodeIds: [member.i, member.j],
    hideGhost: true,
    partialMember: { memberId: member.id, ratio, keep: 'start' },
    includeMemberLoads: true,
    cut: {
      from: { x: at.x - axis.normal.x * cutSize, y: at.y - axis.normal.y * cutSize },
      to: { x: at.x + axis.normal.x * cutSize, y: at.y + axis.normal.y * cutSize },
      label: `s = ${display(project, station, 'length')}`,
      labelAt: 'end',
    },
    forces: [
      {
        place: { at }, fx: axis.c * sign(values.axial), fy: axis.s * sign(values.axial), anchor: 'tail',
        label: `N(s) = ${clearDisplay(project, values.axial, 'force', forceReference)}`, tone: 'axial', length: 25,
      },
      {
        place: { at }, fx: axis.normal.x * sign(values.shear), fy: axis.normal.y * sign(values.shear), anchor: 'tail',
        label: `V(s) = ${clearDisplay(project, values.shear, 'force', forceReference)}`, tone: 'shear', length: 25,
      },
    ],
    moments: [{ place: { at }, sign: values.moment, label: `M(s) = ${clearDisplay(project, values.moment, 'moment', momentReference)}`, tone: 'moment' }],
    legend: 'Se conserva el cuerpo libre izquierdo. Las cargas visibles son las reales hasta el corte; N, V y M se leen en los ejes locales del miembro.',
  };
};

const drawEquations = (context: ReportContext, segment: Segment): void => {
  const { layout, project } = context;
  const middle = (segment.x0 + segment.x1) / 2;
  const values = evaluateSegment(segment, middle);
  const equations: Array<{ symbol: 'N' | 'V' | 'M'; key: 'axial' | 'shear' | 'moment'; value: number }> = [
    { symbol: 'N', key: 'axial', value: values.axial },
    { symbol: 'V', key: 'shear', value: values.shear },
    { symbol: 'M', key: 'moment', value: values.moment },
  ];
  layout.heading('Ecuaciones del tramo y sustitución en el corte', 3);
  for (const { symbol, key, value } of equations) {
    const relation = `${symbol}(\\xi) = ${formatPolynomial(project, key, segment[key], '\\xi')}`;
    layout.text(`${symbol}(s)`, 7.8, layout.fonts.bold, layout.palette.ink);
    layout.ensure(layout.measureMathBlock(relation, 8.2, 12));
    layout.y -= layout.drawMathBlockAt(relation, 8.2, 12, layout.palette.ink, `(${layout.nextEquationNumber()})`);
    layout.keyValues([[
      `Corte en s = ${display(project, middle, 'length')}`,
      clearDisplay(project, value, quantityUnit(key)),
    ]], 150);
  }
  layout.keyValues([
    ['Dominio del tramo', `${display(project, segment.x0, 'length')} ≤ s ≤ ${display(project, segment.x1, 'length')}`],
    ['Variable local', `ξ = s - ${display(project, segment.x0, 'length')}; el origen de la ecuación es el inicio de este tramo.`],
    ['Unidades', `N y V en ${unitFor(project, 'force')}; M en ${unitFor(project, 'moment')}.`],
  ], 132);
};

/** Writes the report in the same order an engineer solves it: member, interval, free body, cut and equations. */
export const drawSegmentCalculationPart = (context: ReportContext): void => {
  const { layout, analysis, project } = context;
  layout.part(
    'Cálculo por miembro y por tramo',
    'Diagramas N, V y M: cada intervalo lleva su cuerpo libre, corte local y ecuaciones N(s), V(s) y M(s).',
  );
  if (!analysis.memberResults.length) {
    layout.note('El análisis no produjo miembros para documentar por tramos.');
    return;
  }

  for (const result of analysis.memberResults) {
    const member = context.index.member(result.memberId);
    if (!member || !result.diagramSegments.length) continue;
    layout.heading(`Barra ${member.id}: ${member.i} → ${member.j}`, 2);
    layout.text(`Longitud analizada: ${display(project, result.length, 'length')}. Los cortes siguen los intervalos exactos publicados por el solver; no son una interpolación gráfica.`, 8.2);
    for (const [segmentIndex, segment] of result.diagramSegments.entries()) {
      layout.heading(`Tramo ${segmentIndex + 1}: ${display(project, segment.x0, 'length')} ≤ s ≤ ${display(project, segment.x1, 'length')}`, 3);
      const scene = segmentScene(context, result, segment, segmentIndex + 1);
      if (scene) {
        layout.figure(
          210,
          (rect) => drawFreeBodyScene(context, rect, scene),
          `Cuerpo libre de la barra ${member.id}, tramo ${segmentIndex + 1}; las acciones N, V y M se muestran en el corte local.`,
        );
      }
      drawEquations(context, segment);
    }
  }
};
