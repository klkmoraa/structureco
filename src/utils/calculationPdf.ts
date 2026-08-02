import type { PDFFont, PDFPage } from 'pdf-lib';
import type { AnalysisResult, DiagramQuantity, MatrixTrace, MemberLoad, ProjectModel } from '../types';
import { toDisplay, unitLabel, type UnitQuantity } from '../engine/units';
import {
  STRUCTURECO_PAYLOAD_FILENAME,
  STRUCTURECO_PAYLOAD_MIME,
  type StructureCoPortablePayload,
} from './portableTypes';
import {
  createPortablePayload,
  serializePortablePayload,
  type PortablePayloadOptions,
} from './portablePayload';
import { formatNearZero, formatNumber } from './numberFormat';

export interface CalculationReportOptions extends PortablePayloadOptions {
  includeEducationTrace?: boolean;
  /** Exact load-case multipliers used to produce the supplied analysis. */
  scenarioFactors?: Record<string, number>;
}

export interface CalculationReportArtifact {
  bytes: Uint8Array;
  filename: string;
  payload: StructureCoPortablePayload;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const CONTENT_BOTTOM = 52;

const safeFilename = (name: string): string => name
  .normalize('NFKD')
  .replace(/[^a-zA-Z0-9 _-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .toLowerCase() || 'structureco-project';

/** Standard PDF fonts use WinAnsi; transliterate engineering glyphs explicitly. */
const PDF_GLYPHS = new Map<string, string>([
  ['−', '-'], ['–', '-'], ['—', '-'], ['·', ' x '], ['⋅', ' x '],
  ['²', '^2'], ['³', '^3'], ['⁴', '^4'], ['⁵', '^5'], ['⁶', '^6'], ['⁷', '^7'], ['⁸', '^8'], ['⁹', '^9'], ['⁰', '^0'], ['ᵀ', '^T'],
  ['₀', '_0'], ['₁', '_1'], ['₂', '_2'], ['₃', '_3'], ['₄', '_4'], ['₅', '_5'], ['₆', '_6'], ['₇', '_7'], ['₈', '_8'], ['₉', '_9'],
  ['ₐ', '_a'], ['ₑ', '_e'], ['ₙ', '_n'], ['ₛ', '_s'], ['ₓ', '_x'], ['ᵧ', '_y'],
  ['ᵃ', '^a'], ['ᵉ', '^e'], ['ᵍ', '^g'], ['ᵢ', '^i'], ['ⱼ', '^j'], ['ˡ', '^l'], ['ⁿ', '^n'],
  ['Σ', 'Sum'], ['∑', 'Sum'], ['Δ', 'Delta'], ['δ', 'delta'], ['θ', 'theta'], ['Θ', 'Theta'], ['ξ', 'xi'], ['Ξ', 'Xi'],
  ['α', 'alpha'], ['β', 'beta'], ['γ', 'gamma'], ['Γ', 'Gamma'], ['ε', 'epsilon'], ['ζ', 'zeta'], ['η', 'eta'],
  ['κ', 'kappa'], ['λ', 'lambda'], ['Λ', 'Lambda'], ['μ', 'mu'], ['ν', 'nu'], ['π', 'pi'], ['Π', 'Pi'],
  ['ρ', 'rho'], ['σ', 'sigma'], ['τ', 'tau'], ['φ', 'phi'], ['Φ', 'Phi'], ['χ', 'chi'], ['ψ', 'psi'], ['ω', 'omega'], ['Ω', 'Omega'],
  ['≤', '<='], ['≥', '>='], ['≈', '~='], ['≠', '!='], ['±', '+/-'], ['×', ' x '], ['÷', '/'],
  ['→', '->'], ['←', '<-'], ['↔', '<->'], ['⇒', '=>'], ['⇐', '<='], ['√', 'sqrt'], ['∫', 'Integral'],
  ['∞', 'inf'], ['∂', 'd'], ['∇', 'grad'], ['∥', '||'], ['⊗', '(x)'], ['⊕', '(+)'],
  ['“', '"'], ['”', '"'], ['‘', "'"], ['’', "'"], ['…', '...'], ['⟨', '<'], ['⟩', '>'],
]);

const pdfText = (value: unknown): string => Array.from(String(value))
  .map((character) => {
    const replacement = PDF_GLYPHS.get(character);
    if (replacement !== undefined) return replacement;
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 255) ? character : '';
  })
  .join('');

/**
 * The report reads the same numbers the interface shows. Before 0.8.1 this module used
 * its own thresholds (1e-5/1e7 here, 1e-4/1e8 in `clearNumber`, 1e-4/1e7 on screen), so a
 * value could appear in three shapes across the app, the PDF and the annex.
 */
const number = (value: number, digits = 6): string =>
  formatNumber(value, 'report', { significantDigits: digits });

const clearNumber = (value: number, reference = 1, digits = 5): string =>
  formatNearZero(value, reference, 'report', { significantDigits: digits });

const quantityUnit = (quantity: DiagramQuantity): UnitQuantity => quantity === 'moment' ? 'moment' : 'force';

const quantitySymbol = (quantity: DiagramQuantity): 'N' | 'V' | 'M' => quantity === 'axial' ? 'N' : quantity === 'shear' ? 'V' : 'M';

const quantityTitle = (quantity: DiagramQuantity): string => quantity === 'axial'
  ? 'Diagrama axial N'
  : quantity === 'shear' ? 'Diagrama cortante V' : 'Diagrama de momento M';

const formatPolynomial = (
  project: ProjectModel,
  quantity: DiagramQuantity,
  coefficients: readonly number[],
  variable = 's',
): string => {
  const xScale = toDisplay(1, project.settings.units, 'length');
  const yScale = toDisplay(1, project.settings.units, quantityUnit(quantity));
  const converted = coefficients.map((coefficient, power) => coefficient * yScale / xScale ** power);
  const reference = Math.max(1, ...converted.map((value) => Math.abs(value)));
  const terms: string[] = [];
  converted.forEach((coefficient, power) => {
    if (Math.abs(coefficient) <= reference * 1e-10) return;
    const sign = coefficient < 0 ? '-' : '+';
    const magnitude = clearNumber(Math.abs(coefficient), reference, 5);
    const factor = power === 0 ? magnitude : power === 1 ? `${magnitude} ${variable}` : `${magnitude} ${variable}^${power}`;
    terms.push(terms.length === 0 ? `${coefficient < 0 ? '-' : ''}${factor}` : `${sign} ${factor}`);
  });
  return terms.join(' ') || '0';
};

const display = (project: ProjectModel, value: number, quantity: UnitQuantity): string =>
  `${number(toDisplay(value, project.settings.units, quantity))} ${unitLabel(project.settings.units, quantity)}`;

const clearDisplay = (project: ProjectModel, value: number, quantity: UnitQuantity, reference = 1): string => {
  const displayValue = toDisplay(value, project.settings.units, quantity);
  const displayReference = Math.max(1, Math.abs(toDisplay(reference, project.settings.units, quantity)));
  return `${clearNumber(displayValue, displayReference)} ${unitLabel(project.settings.units, quantity)}`;
};

const loadBasisLabel = (basis: MemberLoad['lengthBasis']): string => basis === 'horizontal'
  ? 'proyeccion horizontal'
  : basis === 'vertical' ? 'proyeccion vertical' : 'longitud real';

const flexibleMemberLength = (project: ProjectModel, memberId: string): number | undefined => {
  const member = project.members.find((candidate) => candidate.id === memberId);
  if (!member) return undefined;
  const ni = project.nodes.find((node) => node.id === member.i);
  const nj = project.nodes.find((node) => node.id === member.j);
  if (!ni || !nj) return undefined;
  return Math.hypot(nj.x - ni.x, nj.y - ni.y) - (member.rigidOffsetI ?? 0) - (member.rigidOffsetJ ?? 0);
};

const memberLoadDescription = (project: ProjectModel, load: MemberLoad): string => {
  const length = flexibleMemberLength(project, load.memberId);
  if (load.type === 'distributed') {
    const start = Math.min(load.start, load.end);
    const end = Math.max(load.start, load.end);
    const span = end - start;
    const interval = length !== undefined
      ? `dominio x/L=${number(start)} -> ${number(end)} (x=${display(project, start * length, 'length')} -> ${display(project, end * length, 'length')}; longitud real cargada=${display(project, span * length, 'length')}; cobertura=${number(span * 100)}%)`
      : `dominio x/L=${number(start)} -> ${number(end)} (cobertura=${number(span * 100)}%)`;
    const intensity = `qx=${display(project, load.qxStart ?? 0, 'distributedForce')} -> ${display(project, load.qxEnd ?? load.qxStart ?? 0, 'distributedForce')}, qy=${display(project, load.qyStart ?? 0, 'distributedForce')} -> ${display(project, load.qyEnd ?? load.qyStart ?? 0, 'distributedForce')}`;
    return `${interval}; base=${loadBasisLabel(load.lengthBasis)}; ${intensity}`;
  }
  const position = Math.min(1, Math.max(0, load.position ?? 0.5));
  const station = length !== undefined ? `x/L=${number(position)} (x=${display(project, position * length, 'length')})` : `x/L=${number(position)}`;
  return load.type === 'point'
    ? `${station}; Px=${display(project, load.px ?? 0, 'force')}, Py=${display(project, load.py ?? 0, 'force')}`
    : `${station}; M=${display(project, load.moment ?? 0, 'moment')}`;
};

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const paragraphs = pdfText(text).split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
        continue;
      }
      let fragment = '';
      for (const character of word) {
        if (fragment && font.widthOfTextAtSize(fragment + character, size) > maxWidth) {
          lines.push(fragment);
          fragment = character;
        } else fragment += character;
      }
      line = fragment;
    }
    if (line) lines.push(line);
  }
  return lines;
};

const matrixSummary = (label: string, matrix: MatrixTrace): string => {
  const entries = matrix.entries
    .filter((entry) => Math.abs(entry.value) > 1e-12)
    .slice(0, 12)
    .map((entry) => `[${entry.row + 1},${entry.column + 1}]=${number(entry.value, 5)}`);
  return `${label}: ${matrix.rows} x ${matrix.columns}, ${matrix.entries.length} entradas; ${entries.join(', ') || 'matriz nula'}`;
};

export const createCalculationReport = async (
  project: ProjectModel,
  analysis: AnalysisResult,
  options: CalculationReportOptions = {},
): Promise<CalculationReportArtifact> => {
  const [{ PDFDocument, StandardFonts, rgb }, payload] = await Promise.all([
    import('pdf-lib'),
    createPortablePayload(project, analysis, options),
  ]);
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mathRegular = await pdf.embedFont(StandardFonts.TimesRoman);
  const mathItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const brandForest = rgb(0.07, 0.38, 0.21);
  const brandForestDeep = rgb(0.04, 0.24, 0.14);
  const brandForestSoft = rgb(0.86, 0.95, 0.89);
  const pages: PDFPage[] = [];
  let page = pdf.addPage(A4);
  pages.push(page);
  let y = A4[1] - MARGIN;
  const maxWidth = A4[0] - MARGIN * 2;
  const scenarioFactors = options.scenarioFactors ?? Object.fromEntries(
    project.loadCases.filter((loadCase) => loadCase.active).map((loadCase) => [loadCase.id, 1]),
  );

  const newPage = (): void => {
    page = pdf.addPage(A4);
    pages.push(page);
    y = A4[1] - MARGIN;
  };
  const ensure = (height: number): void => {
    if (y - height < CONTENT_BOTTOM) newPage();
  };
  const rule = (): void => {
    ensure(10);
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 0.7, color: rgb(0.73, 0.78, 0.84) });
    y -= 10;
  };
  const text = (content: string, size = 9, font = regular, color = rgb(0.12, 0.16, 0.22), indent = 0): void => {
    const lines = wrapText(content, font, size, maxWidth - indent);
    const lineHeight = size * 1.35;
    for (const line of lines) {
      ensure(lineHeight);
      if (line) page.drawText(line, { x: MARGIN + indent, y: y - size, size, font, color });
      y -= lineHeight;
    }
  };
  const heading = (content: string, level: 1 | 2 = 1): void => {
    const size = level === 1 ? 16 : 11.5;
    ensure(size * 2.1);
    y -= level === 1 ? 8 : 4;
    text(content, size, bold, level === 1 ? brandForest : brandForestDeep);
    if (level === 1) rule();
  };
  const row = (label: string, value: string): void => {
    ensure(15);
    text(`${label}: ${value}`, 8.7, regular, rgb(0.15, 0.18, 0.22), 8);
  };

  const drawGlobalDcl = (height = 168, includeReactions = false): void => {
    if (!project.nodes.length) return;
    ensure(height + 22);
    const left = MARGIN;
    const right = A4[0] - MARGIN;
    const bottom = y - height;
    page.drawRectangle({ x: left, y: bottom, width: right - left, height, borderWidth: 0.7, borderColor: rgb(0.73, 0.78, 0.84), color: rgb(0.975, 0.985, 0.995) });
    page.drawText('DCL global - geometria, apoyos y acciones', { x: left + 10, y: y - 15, size: 8.5, font: bold, color: brandForestDeep });
    const xs = project.nodes.map((node) => node.x);
    const ys = project.nodes.map((node) => node.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const plotLeft = left + 42; const plotRight = right - 42;
    const plotBottom = bottom + 32; const plotTop = y - 34;
    const scaleX = (plotRight - plotLeft) / Math.max(maxX - minX, 1);
    const scaleY = (plotTop - plotBottom) / Math.max(maxY - minY, 1);
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (plotLeft + plotRight - (maxX - minX) * scale) / 2;
    const offsetY = (plotBottom + plotTop - (maxY - minY) * scale) / 2;
    const point = (nodeId: string): { x: number; y: number } | undefined => {
      const node = project.nodes.find((item) => item.id === nodeId);
      return node ? { x: offsetX + (node.x - minX) * scale, y: offsetY + (node.y - minY) * scale } : undefined;
    };
    const drawArrow = (location: { x: number; y: number }, fx: number, fy: number, color = rgb(0.52, 0.18, 0.65), length = 20): { x: number; y: number } | undefined => {
      const magnitude = Math.hypot(fx, fy);
      if (!(magnitude > 1e-12)) return undefined;
      const dx = fx / magnitude * length;
      const dy = fy / magnitude * length;
      const tail = { x: location.x - dx, y: location.y - dy };
      page.drawLine({ start: tail, end: location, thickness: 1.15, color });
      page.drawLine({ start: location, end: { x: location.x - dx * 0.30 - dy * 0.15, y: location.y - dy * 0.30 + dx * 0.15 }, thickness: 1, color });
      page.drawLine({ start: location, end: { x: location.x - dx * 0.30 + dy * 0.15, y: location.y - dy * 0.30 - dx * 0.15 }, thickness: 1, color });
      return tail;
    };
    for (const member of project.members) {
      const start = point(member.i); const end = point(member.j);
      if (!start || !end) continue;
      page.drawLine({ start, end, thickness: member.type === 'rigid' ? 3 : 2, color: rgb(0.12, 0.15, 0.19) });
      page.drawText(pdfText(member.id), { x: (start.x + end.x) / 2 + 3, y: (start.y + end.y) / 2 + 3, size: 6.5, font: bold, color: rgb(0.22, 0.26, 0.31) });
    }
    for (const node of project.nodes) {
      const location = point(node.id);
      if (!location) continue;
      page.drawCircle({ x: location.x, y: location.y, size: 3, color: rgb(1, 1, 1), borderColor: rgb(0.04, 0.40, 0.82), borderWidth: 1.1 });
      page.drawText(pdfText(node.id), { x: location.x + 5, y: location.y + 4, size: 6.5, font: regular, color: rgb(0.11, 0.17, 0.24) });
      if (node.support.type !== 'none') {
        const isRoller = node.support.type === 'roller';
        page.drawLine({ start: { x: location.x, y: location.y - 3 }, end: { x: location.x - 7, y: location.y - 13 }, thickness: 1, color: rgb(0.10, 0.48, 0.25) });
        page.drawLine({ start: { x: location.x, y: location.y - 3 }, end: { x: location.x + 7, y: location.y - 13 }, thickness: 1, color: rgb(0.10, 0.48, 0.25) });
        if (isRoller) {
          page.drawCircle({ x: location.x - 4, y: location.y - 15.5, size: 1.8, borderColor: rgb(0.10, 0.48, 0.25), borderWidth: 0.8 });
          page.drawCircle({ x: location.x + 4, y: location.y - 15.5, size: 1.8, borderColor: rgb(0.10, 0.48, 0.25), borderWidth: 0.8 });
          page.drawLine({ start: { x: location.x - 10, y: location.y - 19 }, end: { x: location.x + 10, y: location.y - 19 }, thickness: 1, color: rgb(0.10, 0.48, 0.25) });
        } else {
          page.drawLine({ start: { x: location.x - 9, y: location.y - 13 }, end: { x: location.x + 9, y: location.y - 13 }, thickness: 1, color: rgb(0.10, 0.48, 0.25) });
        }
      }
    }
    for (const load of project.nodalLoads) {
      const factor = scenarioFactors[load.caseId] ?? 0;
      const location = point(load.nodeId);
      if (!location || factor === 0 || (load.fx === 0 && load.fy === 0)) continue;
      drawArrow(location, load.fx * factor, load.fy * factor, rgb(0.52, 0.18, 0.65), 24);
    }
    for (const load of project.memberLoads) {
      const factor = scenarioFactors[load.caseId] ?? 0;
      if (factor === 0) continue;
      const member = project.members.find((candidate) => candidate.id === load.memberId);
      if (!member) continue;
      const startNode = project.nodes.find((node) => node.id === member.i);
      const endNode = project.nodes.find((node) => node.id === member.j);
      const screenStart = point(member.i);
      const screenEnd = point(member.j);
      if (!startNode || !endNode || !screenStart || !screenEnd) continue;
      const modelDx = endNode.x - startNode.x;
      const modelDy = endNode.y - startNode.y;
      const memberLength = Math.hypot(modelDx, modelDy);
      if (!(memberLength > 0)) continue;
      const startOffset = member.rigidOffsetI ?? 0;
      const endOffset = member.rigidOffsetJ ?? 0;
      const flexibleLength = memberLength - startOffset - endOffset;
      if (!(flexibleLength > 0)) continue;
      const c = modelDx / memberLength;
      const s = modelDy / memberLength;
      const at = (ratio: number) => ({
        x: screenStart.x + (screenEnd.x - screenStart.x) * ratio,
        y: screenStart.y + (screenEnd.y - screenStart.y) * ratio,
      });
      const atFlexibleRatio = (ratio: number) => at((startOffset + ratio * flexibleLength) / memberLength);
      const globalVector = (x: number, y: number): [number, number] => load.coordinateSystem === 'local'
        ? [c * x - s * y, s * x + c * y]
        : [x, y];
      const actionColor = rgb(0.05, 0.48, 0.23);
      if (load.type === 'distributed') {
        const startRatio = Math.min(load.start, load.end);
        const endRatio = Math.max(load.start, load.end);
        const arrowTails: Array<{ x: number; y: number }> = [];
        const count = 7;
        for (let index = 0; index < count; index += 1) {
          const t = index / (count - 1);
          const ratio = startRatio + (endRatio - startRatio) * t;
          const qx = ((load.qxStart ?? 0) + ((load.qxEnd ?? load.qxStart ?? 0) - (load.qxStart ?? 0)) * t) * factor;
          const qy = ((load.qyStart ?? 0) + ((load.qyEnd ?? load.qyStart ?? 0) - (load.qyStart ?? 0)) * t) * factor;
          const [gx, gy] = globalVector(qx, qy);
          const tail = drawArrow(atFlexibleRatio(ratio), gx, gy, actionColor, 16);
          if (tail) arrowTails.push(tail);
        }
        if (arrowTails.length > 1) page.drawLine({ start: arrowTails[0], end: arrowTails.at(-1)!, thickness: 0.9, color: actionColor });
        const label = atFlexibleRatio((startRatio + endRatio) / 2);
        page.drawText(pdfText(`${load.id} [${number(startRatio)}-${number(endRatio)}]`), { x: label.x + 3, y: label.y + 20, size: 6, font: bold, color: actionColor });
      } else if (load.type === 'point') {
        const [gx, gy] = globalVector((load.px ?? 0) * factor, (load.py ?? 0) * factor);
        const location = atFlexibleRatio(Math.min(1, Math.max(0, load.position ?? 0.5)));
        const tail = drawArrow(location, gx, gy, actionColor, 22) ?? location;
        page.drawText(pdfText(load.id), { x: tail.x + 2, y: tail.y + 5, size: 6, font: bold, color: actionColor });
      } else {
        const location = atFlexibleRatio(Math.min(1, Math.max(0, load.position ?? 0.5)));
        page.drawText(pdfText(`${load.id}: M x ${number(factor)}`), { x: location.x + 4, y: location.y + 8, size: 6, font: bold, color: actionColor });
      }
    }
    if (includeReactions) {
      const reactionColor = rgb(0.04, 0.40, 0.72);
      const reactionReference = Math.max(1, ...analysis.nodeResults.flatMap((result) => [Math.abs(result.rx), Math.abs(result.ry)]));
      for (const result of analysis.nodeResults) {
        const location = point(result.nodeId);
        if (!location) continue;
        const components: Array<{ value: number; fx: number; fy: number; label: string }> = [
          { value: result.rx, fx: result.rx, fy: 0, label: 'Rx' },
          { value: result.ry, fx: 0, fy: result.ry, label: 'Ry' },
        ];
        for (const component of components) {
          if (Math.abs(component.value) <= reactionReference * 1e-9) continue;
          const tail = drawArrow(location, component.fx, component.fy, reactionColor, 25);
          if (!tail) continue;
          const value = clearDisplay(project, component.value, 'force', reactionReference);
          const labelX = component.fx === 0 ? tail.x + 4 : Math.min(location.x, tail.x) - 2;
          const labelY = component.fy === 0 ? tail.y + 5 : tail.y + (component.value < 0 ? -8 : 4);
          page.drawText(pdfText(`${component.label} ${value}`), {
            x: labelX,
            y: labelY,
            size: 6.2,
            font: bold,
            color: reactionColor,
          });
        }
      }
    }
    y = bottom - 12;
  };

  const drawMemberDiagrams = (result: AnalysisResult['memberResults'][number]): void => {
    if (result.diagram.length < 2 || result.length <= 0) return;
    const chartHeight = 58;
    const blockHeight = 86;
    ensure(blockHeight + 8);
    const gap = 9;
    const chartWidth = (maxWidth - gap * 2) / 3;
    const chartTop = y - 14;
    const chartBottom = chartTop - chartHeight;
    const definitions = [
      { key: 'axial' as const, label: 'N axial', color: rgb(0.02, 0.40, 0.82) },
      { key: 'shear' as const, label: 'V cortante', color: rgb(0.08, 0.47, 0.20) },
      { key: 'moment' as const, label: 'M momento', color: rgb(0.79, 0.17, 0.15) },
    ];
    for (const [index, definition] of definitions.entries()) {
      const left = MARGIN + index * (chartWidth + gap);
      const values = result.diagram.map((entry) => entry[definition.key]);
      const maximum = Math.max(1e-12, ...values.map((value) => Math.abs(value)));
      const baseline = chartBottom + chartHeight / 2;
      page.drawText(definition.label, { x: left, y: chartTop + 4, size: 7.3, font: bold, color: definition.color });
      page.drawRectangle({ x: left, y: chartBottom, width: chartWidth, height: chartHeight, borderColor: rgb(0.80, 0.83, 0.87), borderWidth: 0.5 });
      page.drawLine({ start: { x: left, y: baseline }, end: { x: left + chartWidth, y: baseline }, thickness: 0.45, color: rgb(0.55, 0.58, 0.62) });
      for (let pointIndex = 1; pointIndex < result.diagram.length; pointIndex += 1) {
        const previous = result.diagram[pointIndex - 1];
        const current = result.diagram[pointIndex];
        page.drawLine({
          start: { x: left + previous.x / result.length * chartWidth, y: baseline + previous[definition.key] / maximum * (chartHeight * 0.40) },
          end: { x: left + current.x / result.length * chartWidth, y: baseline + current[definition.key] / maximum * (chartHeight * 0.40) },
          thickness: 1.2,
          color: definition.color,
        });
      }
      // These legends printed raw base-unit numbers with no label, next to tables stating
      // the same quantities in the project's display units. Convert, collapse the noise
      // against the curve's own magnitude, and name the unit.
      const quantityUnitKey = quantityUnit(definition.key);
      const scale = Math.max(...values.map((value) => Math.abs(toDisplay(value, project.settings.units, quantityUnitKey))), 1e-12);
      const legendValue = (value: number) =>
        clearNumber(toDisplay(value, project.settings.units, quantityUnitKey), scale, 3);
      const legend = `min ${legendValue(Math.min(...values))} | max ${legendValue(Math.max(...values))} ${unitLabel(project.settings.units, quantityUnitKey)}`;
      page.drawText(pdfText(legend), { x: left + 3, y: chartBottom + 3, size: 5.7, font: regular, color: rgb(0.34, 0.38, 0.43) });
    }
    y = chartBottom - 14;
  };

  const visualColors: Record<DiagramQuantity, ReturnType<typeof rgb>> = {
    axial: rgb(0.03, 0.40, 0.75),
    shear: rgb(0.05, 0.51, 0.27),
    moment: rgb(0.86, 0.20, 0.18),
  };

  const drawVisualHeader = (section: string, subtitle: string): void => {
    page.drawRectangle({ x: 0, y: A4[1] - 72, width: A4[0], height: 72, color: brandForestDeep });
    page.drawRectangle({ x: MARGIN, y: A4[1] - 52, width: 30, height: 30, color: brandForest });
    page.drawText('S', { x: MARGIN + 9, y: A4[1] - 44, size: 17, font: bold, color: rgb(1, 1, 1) });
    page.drawText('structureCo', { x: MARGIN + 42, y: A4[1] - 38, size: 17, font: bold, color: rgb(1, 1, 1) });
    page.drawText('MEMORIA DE CALCULO ESTRUCTURAL', { x: MARGIN + 42, y: A4[1] - 52, size: 6.5, font: bold, color: brandForestSoft });
    page.drawText(pdfText(section), { x: A4[0] - MARGIN - bold.widthOfTextAtSize(pdfText(section), 12), y: A4[1] - 37, size: 12, font: bold, color: rgb(1, 1, 1) });
    page.drawText(pdfText(subtitle), { x: A4[0] - MARGIN - regular.widthOfTextAtSize(pdfText(subtitle), 7), y: A4[1] - 52, size: 7, font: regular, color: brandForestSoft });
  };

  const drawSectionBand = (index: string, titleValue: string, subtitle: string): void => {
    page.drawRectangle({ x: MARGIN, y: 724, width: 31, height: 22, color: brandForest });
    page.drawText(index, { x: MARGIN + 9, y: 731, size: 7, font: bold, color: rgb(1, 1, 1) });
    page.drawText(pdfText(titleValue), { x: MARGIN + 42, y: 732, size: 15, font: bold, color: brandForestDeep });
    page.drawText(pdfText(subtitle), { x: MARGIN + 42, y: 719, size: 7.5, font: regular, color: rgb(0.38, 0.44, 0.40) });
  };

  const drawPanel = (x: number, bottom: number, width: number, height: number, color = rgb(1, 1, 1)): void => {
    page.drawRectangle({
      x,
      y: bottom,
      width,
      height,
      color,
      borderColor: rgb(0.78, 0.84, 0.80),
      borderWidth: 0.7,
    });
  };

  const mathWidth = (expression: string, size: number): number => {
    const source = pdfText(expression).replace(/\*/g, ' x ');
    let width = 0;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if ((character === '^' || character === '_') && source[index + 1]) {
        const script = source[index + 1];
        const scriptFont = /[A-Za-z]/.test(script) ? mathItalic : mathRegular;
        width += scriptFont.widthOfTextAtSize(script, size * 0.64) + size * 0.04;
        index += 1;
      } else {
        const characterFont = /[A-Za-z]/.test(character) ? mathItalic : mathRegular;
        width += characterFont.widthOfTextAtSize(character, size);
      }
    }
    return width;
  };

  const drawMathFormula = (
    expression: string,
    x: number,
    baseline: number,
    requestedSize: number,
    color: ReturnType<typeof rgb>,
    maxFormulaWidth = Number.POSITIVE_INFINITY,
  ): number => {
    const source = pdfText(expression).replace(/\*/g, ' x ');
    let size = requestedSize;
    while (size > 7.5 && mathWidth(source, size) > maxFormulaWidth) size -= 0.4;
    let cursor = x;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if ((character === '^' || character === '_') && source[index + 1]) {
        const script = source[index + 1];
        const scriptSize = size * 0.64;
        const scriptFont = /[A-Za-z]/.test(script) ? mathItalic : mathRegular;
        page.drawText(script, {
          x: cursor,
          y: baseline + (character === '^' ? size * 0.43 : -size * 0.25),
          size: scriptSize,
          font: scriptFont,
          color,
        });
        cursor += scriptFont.widthOfTextAtSize(script, scriptSize) + size * 0.04;
        index += 1;
        continue;
      }
      const characterFont = /[A-Za-z]/.test(character) ? mathItalic : mathRegular;
      page.drawText(character, { x: cursor, y: baseline, size, font: characterFont, color });
      cursor += characterFont.widthOfTextAtSize(character, size);
    }
    return cursor - x;
  };

  const drawFormulaCard = (
    label: string,
    expression: string,
    explanation: string,
    x: number,
    bottom: number,
    width: number,
    color: ReturnType<typeof rgb>,
  ): void => {
    page.drawRectangle({ x, y: bottom, width, height: 54, color: rgb(0.975, 0.985, 0.98), borderColor: color, borderWidth: 0.65 });
    page.drawText(pdfText(label.toUpperCase()), { x: x + 10, y: bottom + 39, size: 6.3, font: bold, color });
    drawMathFormula(expression, x + 10, bottom + 21, 11.2, rgb(0.10, 0.15, 0.12), width - 20);
    page.drawText(pdfText(explanation), { x: x + 10, y: bottom + 7, size: 6.2, font: regular, color: rgb(0.37, 0.43, 0.39) });
  };

  const absoluteExtreme = (quantity: DiagramQuantity): { value: number; memberId: string; x: number } | undefined => {
    let best: { value: number; memberId: string; x: number } | undefined;
    for (const result of analysis.memberResults) {
      const critical = result.criticalPoints.filter((point) => point.quantity === quantity);
      const candidates = critical.length
        ? critical.map((point) => ({ value: point.value, memberId: result.memberId, x: point.x }))
        : result.diagram.map((point) => ({ value: point[quantity], memberId: result.memberId, x: point.x }));
      for (const candidate of candidates) {
        if (!best || Math.abs(candidate.value) > Math.abs(best.value)) best = candidate;
      }
    }
    return best;
  };

  const drawKpi = (x: number, label: string, value: string, color: ReturnType<typeof rgb>): void => {
    drawPanel(x, 653, 118, 50);
    page.drawRectangle({ x, y: 653, width: 4, height: 50, color });
    page.drawText(pdfText(label.toUpperCase()), { x: x + 12, y: 683, size: 6.5, font: bold, color: rgb(0.38, 0.44, 0.40) });
    page.drawText(pdfText(value), { x: x + 12, y: 663, size: 11.5, font: bold, color });
  };

  const drawExecutivePage = (): void => {
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(0.965, 0.975, 0.968) });
    drawVisualHeader(project.name, options.scenarioName ?? 'Analisis activo');
    drawSectionBand('01', 'DCL global y equilibrio', 'Cargas, reacciones y resultados gobernantes en una sola lectura');
    const axialExtreme = absoluteExtreme('axial');
    const shearExtreme = absoluteExtreme('shear');
    const momentExtreme = absoluteExtreme('moment');
    const reactionMaximum = analysis.nodeResults.reduce((best, result) => {
      const values = [result.rx, result.ry];
      return Math.max(best, ...values.map((value) => Math.abs(value)));
    }, 0);
    drawKpi(MARGIN, 'Reaccion max.', clearDisplay(project, reactionMaximum, 'force', reactionMaximum), rgb(0.04, 0.40, 0.72));
    drawKpi(MARGIN + 126, '|N| max.', axialExtreme ? clearDisplay(project, Math.abs(axialExtreme.value), 'force', Math.abs(axialExtreme.value)) : 'n/d', visualColors.axial);
    drawKpi(MARGIN + 252, '|V| max.', shearExtreme ? clearDisplay(project, Math.abs(shearExtreme.value), 'force', Math.abs(shearExtreme.value)) : 'n/d', visualColors.shear);
    drawKpi(MARGIN + 378, '|M| max.', momentExtreme ? clearDisplay(project, Math.abs(momentExtreme.value), 'moment', Math.abs(momentExtreme.value)) : 'n/d', visualColors.moment);
    y = 628;
    drawGlobalDcl(262, true);
    drawPanel(MARGIN, 60, 242, 278);
    page.drawText('OPERACIONES DE EQUILIBRIO', { x: MARGIN + 12, y: 318, size: 8.5, font: bold, color: brandForestDeep });
    const equilibriumRows = [
      { title: 'Fuerzas horizontales', formula: 'F_x = 0', result: clearDisplay(project, analysis.equilibrium.sumFx, 'force', reactionMaximum) },
      { title: 'Fuerzas verticales', formula: 'F_y = 0', result: clearDisplay(project, analysis.equilibrium.sumFy, 'force', reactionMaximum) },
      { title: 'Momentos respecto al origen', formula: 'M_O = 0', result: clearDisplay(project, analysis.equilibrium.sumM, 'moment', momentExtreme ? Math.abs(momentExtreme.value) : 1) },
      { title: 'Control numerico del cierre', formula: 'r = ||residuo|| / ||acciones||', result: clearNumber(analysis.equilibrium.normalizedResidual) },
    ];
    let rowY = 283;
    equilibriumRows.forEach((entry, index) => {
      page.drawCircle({ x: MARGIN + 18, y: rowY + 3, size: 8, color: index === equilibriumRows.length - 1 ? rgb(0.12, 0.50, 0.34) : brandForest });
      page.drawText(String(index + 1), { x: MARGIN + 15.5, y: rowY, size: 6.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText(pdfText(entry.title.toUpperCase()), { x: MARGIN + 34, y: rowY + 9, size: 5.8, font: bold, color: rgb(0.34, 0.41, 0.36) });
      drawMathFormula(entry.formula, MARGIN + 34, rowY - 8, 10.4, rgb(0.10, 0.15, 0.12), 112);
      page.drawRectangle({ x: MARGIN + 154, y: rowY - 12, width: 73, height: 23, color: rgb(0.95, 0.98, 0.96), borderColor: visualColors.shear, borderWidth: 0.65 });
      page.drawText('RESULTADO', { x: MARGIN + 160, y: rowY + 2, size: 4.8, font: bold, color: visualColors.shear });
      page.drawText(pdfText(entry.result), { x: MARGIN + 160, y: rowY - 8, size: 6.4, font: bold, color: rgb(0.10, 0.35, 0.22) });
      rowY -= 44;
    });
    page.drawRectangle({ x: MARGIN + 12, y: 80, width: 218, height: 52, color: rgb(0.91, 0.96, 0.93), borderColor: rgb(0.12, 0.50, 0.34), borderWidth: 0.8 });
    page.drawText(analysis.success ? 'EQUILIBRIO APROBADO' : 'REVISAR EL MODELO', { x: MARGIN + 24, y: 109, size: 10.5, font: bold, color: analysis.success ? rgb(0.08, 0.43, 0.27) : rgb(0.75, 0.20, 0.16) });
    page.drawText(pdfText(analysis.success ? 'El solucionador cerro equilibrio y compatibilidad.' : 'Existen incidencias que impiden cerrar el analisis.'), { x: MARGIN + 24, y: 94, size: 6.7, font: regular, color: rgb(0.28, 0.35, 0.30) });

    drawPanel(MARGIN + 254, 60, 241, 278);
    page.drawText('REACCIONES Y DATOS CLAVE', { x: MARGIN + 266, y: 318, size: 8.5, font: bold, color: brandForestDeep });
    rowY = 289;
    for (const result of analysis.nodeResults.filter((item) => Math.abs(item.rx) + Math.abs(item.ry) + Math.abs(item.rm) > 1e-10).slice(0, 5)) {
      page.drawText(pdfText(`Nodo ${result.nodeId}`), { x: MARGIN + 266, y: rowY, size: 7.5, font: bold, color: brandForestDeep });
      page.drawText(pdfText(`Rx ${clearDisplay(project, result.rx, 'force', reactionMaximum)}  |  Ry ${clearDisplay(project, result.ry, 'force', reactionMaximum)}`), { x: MARGIN + 266, y: rowY - 14, size: 7, font: regular, color: rgb(0.20, 0.25, 0.22) });
      if (Math.abs(result.rm) > 1e-10) page.drawText(pdfText(`M ${clearDisplay(project, result.rm, 'moment', momentExtreme ? Math.abs(momentExtreme.value) : 1)}`), { x: MARGIN + 266, y: rowY - 26, size: 7, font: regular, color: rgb(0.20, 0.25, 0.22) });
      rowY -= 49;
    }
    page.drawText('HIPOTESIS', { x: MARGIN + 266, y: 124, size: 7, font: bold, color: brandForestDeep });
    const formulation = analysis.educationTrace?.formulation ?? 'analisis estatico lineal 2D';
    const hypothesis = wrapText(`${formulation}; pequenas deformaciones; propiedades prismaticas por miembro.`, regular, 6.8, 213);
    hypothesis.slice(0, 3).forEach((entry, index) => page.drawText(entry, { x: MARGIN + 266, y: 109 - index * 11, size: 6.8, font: regular, color: rgb(0.30, 0.36, 0.32) }));
  };

  const drawGlobalQuantityDiagram = (quantity: DiagramQuantity, left: number, bottom: number, width: number, height: number): void => {
    if (!project.nodes.length) return;
    const color = visualColors[quantity];
    const xs = project.nodes.map((node) => node.x);
    const ys = project.nodes.map((node) => node.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const plotLeft = left + 58; const plotRight = left + width - 58;
    const plotBottom = bottom + 52; const plotTop = bottom + height - 48;
    const scale = Math.min((plotRight - plotLeft) / Math.max(maxX - minX, 1), (plotTop - plotBottom) / Math.max(maxY - minY, 1));
    const offsetX = (plotLeft + plotRight - (maxX - minX) * scale) / 2;
    const offsetY = (plotBottom + plotTop - (maxY - minY) * scale) / 2;
    const modelPoint = (xValue: number, yValue: number) => ({ x: offsetX + (xValue - minX) * scale, y: offsetY + (yValue - minY) * scale });
    const maximum = Math.max(1e-12, ...analysis.memberResults.flatMap((result) => result.diagram.map((entry) => Math.abs(entry[quantity]))));
    const amplitude = Math.min(62, Math.max(34, Math.min(width, height) * 0.18));
    const side = project.settings.diagramSide === 'negative' ? -1 : 1;
    const labelCandidates: Array<{ value: number; x: number; y: number; memberId: string; station: number }> = [];
    for (const member of project.members) {
      const ni = project.nodes.find((node) => node.id === member.i);
      const nj = project.nodes.find((node) => node.id === member.j);
      if (!ni || !nj) continue;
      const start = modelPoint(ni.x, ni.y); const end = modelPoint(nj.x, nj.y);
      page.drawLine({ start, end, thickness: member.type === 'rigid' ? 3.2 : 2.2, color: rgb(0.42, 0.49, 0.45) });
      const result = analysis.memberResults.find((item) => item.memberId === member.id);
      const totalLength = Math.hypot(nj.x - ni.x, nj.y - ni.y);
      if (!result || result.diagram.length < 2 || totalLength <= 0 || member.type === 'rigid') continue;
      const ux = (nj.x - ni.x) / totalLength;
      const uy = (nj.y - ni.y) / totalLength;
      const normal = { x: -uy, y: ux };
      const startOffset = result.startOffset ?? member.rigidOffsetI ?? 0;
      const diagramPoints = result.diagram.map((entry) => {
        const ratio = Math.min(1, Math.max(0, (startOffset + entry.x) / totalLength));
        const base = { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
        const diagramOffset = side * entry[quantity] / maximum * amplitude;
        return { entry, base, curve: { x: base.x + normal.x * diagramOffset, y: base.y + normal.y * diagramOffset } };
      });
      const stride = Math.max(1, Math.floor(diagramPoints.length / 18));
      diagramPoints.forEach((item, index) => {
        if (index % stride === 0 || index === diagramPoints.length - 1) {
          page.drawLine({ start: item.base, end: item.curve, thickness: 0.45, color, opacity: 0.48 });
        }
        if (index > 0) page.drawLine({ start: diagramPoints[index - 1].curve, end: item.curve, thickness: 1.55, color });
      });
      const critical = result.criticalPoints.filter((point) => point.quantity === quantity).sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];
      if (critical) {
        const ratio = Math.min(1, Math.max(0, (startOffset + critical.x) / totalLength));
        const base = { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
        const diagramOffset = side * critical.value / maximum * amplitude;
        labelCandidates.push({ value: critical.value, x: base.x + normal.x * diagramOffset, y: base.y + normal.y * diagramOffset, memberId: member.id, station: critical.x });
      }
    }
    for (const node of project.nodes) {
      const location = modelPoint(node.x, node.y);
      page.drawCircle({ x: location.x, y: location.y, size: 3.2, color: rgb(1, 1, 1), borderColor: rgb(0.30, 0.38, 0.33), borderWidth: 1.1 });
      page.drawText(pdfText(node.id), { x: location.x + 5, y: location.y + 5, size: 6.4, font: bold, color: rgb(0.25, 0.31, 0.27) });
    }
    labelCandidates.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 6).forEach((candidate, index) => {
      const value = clearDisplay(project, candidate.value, quantityUnit(quantity), maximum);
      const station = display(project, candidate.station, 'length');
      const label = `${candidate.memberId}: ${value} @ ${station}`;
      const labelY = Math.min(bottom + height - 28, Math.max(bottom + 18, candidate.y + (index % 2 === 0 ? 8 : -12)));
      page.drawText(pdfText(label), { x: Math.min(left + width - 130, Math.max(left + 8, candidate.x + 5)), y: labelY, size: 6.2, font: bold, color });
    });
    page.drawLine({ start: { x: left + 14, y: bottom + 20 }, end: { x: left + 42, y: bottom + 20 }, thickness: 1.7, color });
    page.drawText(pdfText(`${quantitySymbol(quantity)} positivo segun los ejes locales de cada miembro`), { x: left + 50, y: bottom + 17, size: 6.8, font: regular, color: rgb(0.32, 0.39, 0.35) });
  };

  const drawQuantityPage = (quantity: DiagramQuantity, index: string): void => {
    newPage();
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(0.965, 0.975, 0.968) });
    drawVisualHeader(project.name, quantityTitle(quantity));
    drawSectionBand(index, quantityTitle(quantity), 'Diagrama global, valores gobernantes y ecuaciones exactas por tramo');
    drawPanel(MARGIN, 352, maxWidth, 346);
    page.drawRectangle({ x: MARGIN + 12, y: 670, width: 78, height: 20, color: visualColors[quantity] });
    page.drawText(pdfText(`DIAGRAMA ${quantitySymbol(quantity)}`), { x: MARGIN + 23, y: 677, size: 7, font: bold, color: rgb(1, 1, 1) });
    drawGlobalQuantityDiagram(quantity, MARGIN + 8, 365, maxWidth - 16, 300);
    drawPanel(MARGIN, 60, maxWidth, 270);
    page.drawText('OPERACIONES CLARAS', { x: MARGIN + 14, y: 307, size: 9, font: bold, color: brandForestDeep });
    const relation = quantity === 'axial' ? 'dN/dx = -p(x)' : quantity === 'shear' ? 'dV/dx = q(x)' : 'dM/dx = V(x)';
    const relationExplanation = quantity === 'axial'
      ? 'La carga axial distribuida determina como cambia la fuerza normal N.'
      : quantity === 'shear'
        ? 'La carga transversal q determina la pendiente del diagrama de cortante V.'
        : 'El cortante V determina la pendiente del diagrama de momento M.';
    drawFormulaCard('Relacion fundamental', relation, relationExplanation, MARGIN + 14, 248, maxWidth - 28, visualColors[quantity]);
    let operationBottom = 174;
    const visibleResults = analysis.memberResults.filter((result) => result.diagramSegments.length).slice(0, 2);
    visibleResults.forEach((result, resultIndex) => {
      const segment = result.diagramSegments[0];
      const coefficients = segment[quantity];
      const formula = `${quantitySymbol(quantity)}(s) = ${formatPolynomial(project, quantity, coefficients)}`;
      const minValue = quantity === 'axial' ? result.minAxial : quantity === 'shear' ? result.minShear : result.minMoment;
      const maxValue = quantity === 'axial' ? result.maxAxial : quantity === 'shear' ? result.maxShear : result.maxMoment;
      const unit = quantityUnit(quantity);
      page.drawRectangle({ x: MARGIN + 14, y: operationBottom, width: maxWidth - 28, height: 63, color: rgb(1, 1, 1), borderColor: rgb(0.82, 0.87, 0.84), borderWidth: 0.6 });
      page.drawCircle({ x: MARGIN + 29, y: operationBottom + 45, size: 8, color: brandForest });
      page.drawText(String(resultIndex + 1), { x: MARGIN + 26.5, y: operationBottom + 42.5, size: 6.5, font: bold, color: rgb(1, 1, 1) });
      page.drawText(pdfText(`MIEMBRO ${result.memberId} | FUNCION DEL TRAMO`), { x: MARGIN + 45, y: operationBottom + 46, size: 6.3, font: bold, color: brandForestDeep });
      drawMathFormula(formula, MARGIN + 45, operationBottom + 27, 10.6, rgb(0.10, 0.15, 0.12), 300);
      page.drawText(pdfText(`s = distancia local; valida de ${display(project, segment.x0, 'length')} a ${display(project, segment.x1, 'length')}.`), { x: MARGIN + 45, y: operationBottom + 10, size: 6.2, font: regular, color: rgb(0.40, 0.46, 0.42) });
      const extremaReference = Math.max(1e-12, Math.abs(minValue), Math.abs(maxValue));
      page.drawRectangle({ x: MARGIN + 370, y: operationBottom + 12, width: 111, height: 39, color: rgb(0.95, 0.98, 0.96), borderColor: visualColors[quantity], borderWidth: 0.7 });
      page.drawText('RESULTADOS', { x: MARGIN + 378, y: operationBottom + 40, size: 5.2, font: bold, color: visualColors[quantity] });
      page.drawText(pdfText(`min: ${clearDisplay(project, minValue, unit, extremaReference)}`), { x: MARGIN + 378, y: operationBottom + 27, size: 6.3, font: bold, color: visualColors[quantity] });
      page.drawText(pdfText(`max: ${clearDisplay(project, maxValue, unit, extremaReference)}`), { x: MARGIN + 378, y: operationBottom + 16, size: 6.3, font: bold, color: visualColors[quantity] });
      operationBottom -= 70;
    });
    if (visibleResults.length === 1) {
      page.drawText('COMO SE CONSTRUYE', { x: MARGIN + 14, y: 157, size: 7, font: bold, color: brandForestDeep });
      const steps = quantity === 'axial'
        ? ['Partir de las fuerzas de extremo.', 'Aplicar dN/dx = -p(x).', 'Evaluar extremos, saltos y ceros.']
        : quantity === 'shear'
          ? ['Partir del cortante inicial.', 'Integrar la carga q(x).', 'Localizar cambios de signo y saltos.']
          : ['Partir del momento inicial.', 'Integrar V(x) por cada tramo.', 'Resolver V=0 para hallar extremos.'];
      const stepWidth = (maxWidth - 48) / 3;
      steps.forEach((step, stepIndex) => {
        const stepX = MARGIN + 14 + stepIndex * (stepWidth + 10);
        page.drawRectangle({ x: stepX, y: 78, width: stepWidth, height: 65, color: rgb(0.96, 0.98, 0.97), borderColor: rgb(0.82, 0.87, 0.84), borderWidth: 0.6 });
        page.drawCircle({ x: stepX + 15, y: 124, size: 8, color: visualColors[quantity] });
        page.drawText(String(stepIndex + 1), { x: stepX + 12.5, y: 121.5, size: 6.5, font: bold, color: rgb(1, 1, 1) });
        const lines = wrapText(step, regular, 6.8, stepWidth - 20).slice(0, 3);
        lines.forEach((entry, lineIndex) => page.drawText(entry, { x: stepX + 10, y: 105 - lineIndex * 10, size: 6.8, font: regular, color: rgb(0.26, 0.33, 0.28) }));
      });
    }
    if (analysis.memberResults.length > visibleResults.length) page.drawText(pdfText(`Se muestran los primeros ${visibleResults.length}; el anexo conserva las ecuaciones y extremos de los ${analysis.memberResults.length} miembros.`), { x: MARGIN + 14, y: 77, size: 6.4, font: bold, color: rgb(0.36, 0.43, 0.38) });
  };

  const drawProcedureSummary = (): void => {
    newPage();
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: rgb(0.965, 0.975, 0.968) });
    drawVisualHeader(project.name, 'Procedimiento claro y verificable');
    drawSectionBand('05', 'Procedimiento y calculos', 'Secuencia resumida desde el modelo hasta la comprobacion');
    const representative = (categories: Array<AnalysisResult['explanation'][number]['category']>) => analysis.explanation.find((step) => categories.includes(step.category));
    const stages = [
      { title: 'Modelo y convenciones', fallback: `${project.nodes.length} nodos y ${project.members.length} miembros; ejes globales y locales definidos.`, step: representative(['geometry']) },
      { title: 'Cargas y resultantes', fallback: `${payload.metadata.loadCount} acciones activas transformadas a vectores nodales consistentes.`, step: representative(['loads']) },
      { title: 'Ensamblaje y restricciones', fallback: 'Se ensambla K global y se aplican apoyos, liberaciones y desplazamientos prescritos.', step: representative(['stiffness']) },
      { title: 'Recuperacion N-V-M', fallback: 'Las fuerzas de extremo y las cargas de miembro producen funciones exactas por tramo.', step: representative(['results']) },
      { title: 'Equilibrio y verificacion', fallback: `Residuo normalizado ${clearNumber(analysis.equilibrium.normalizedResidual)}; condicion estimada ${clearNumber(analysis.conditionEstimate)}.`, step: representative(['equilibrium', 'verification']) },
    ];
    let stageY = 676;
    stages.forEach((stage, stageIndex) => {
      drawPanel(MARGIN, stageY - 100, maxWidth, 91, stageIndex === stages.length - 1 ? rgb(0.93, 0.97, 0.94) : rgb(1, 1, 1));
      page.drawCircle({ x: MARGIN + 22, y: stageY - 31, size: 11, color: stageIndex === stages.length - 1 ? rgb(0.08, 0.47, 0.29) : brandForest });
      page.drawText(String(stageIndex + 1), { x: MARGIN + 18.8, y: stageY - 34.5, size: 8, font: bold, color: rgb(1, 1, 1) });
      page.drawText(pdfText(stage.title.toUpperCase()), { x: MARGIN + 44, y: stageY - 27, size: 8, font: bold, color: brandForestDeep });
      const summaryLines = wrapText(stage.step?.summary ?? stage.fallback, regular, 7.2, maxWidth - 68).slice(0, 2);
      summaryLines.forEach((entry, lineIndex) => page.drawText(entry, { x: MARGIN + 44, y: stageY - 43 - lineIndex * 11, size: 7.2, font: regular, color: rgb(0.23, 0.29, 0.25) }));
      const equation = stage.step?.equations[0];
      if (equation) {
        const formulaColor = stageIndex === stages.length - 1 ? rgb(0.08, 0.47, 0.29) : rgb(0.32, 0.38, 0.34);
        page.drawRectangle({ x: MARGIN + 44, y: stageY - 91, width: maxWidth - 62, height: 24, color: rgb(0.965, 0.98, 0.97), borderColor: rgb(0.82, 0.87, 0.84), borderWidth: 0.5 });
        page.drawText('ECUACION CLAVE', { x: MARGIN + 52, y: stageY - 76, size: 5.2, font: bold, color: formulaColor });
        drawMathFormula(equation.length > 95 ? `${equation.slice(0, 92)}...` : equation, MARGIN + 126, stageY - 84, 8.8, formulaColor, maxWidth - 152);
      }
      stageY -= 113;
    });
    page.drawRectangle({ x: MARGIN, y: 73, width: maxWidth, height: 40, color: rgb(0.91, 0.96, 0.93), borderColor: rgb(0.08, 0.47, 0.29), borderWidth: 0.8 });
    page.drawText(analysis.success ? 'RESULTADO: ANALISIS RESUELTO Y TRAZABLE' : 'RESULTADO: EL MODELO REQUIERE CORRECCIONES', { x: MARGIN + 14, y: 94, size: 8.5, font: bold, color: analysis.success ? rgb(0.08, 0.47, 0.29) : rgb(0.75, 0.20, 0.16) });
    page.drawText('Las paginas siguientes conservan datos, auditoria, ecuaciones completas y matrices como anexo tecnico.', { x: MARGIN + 14, y: 81, size: 6.6, font: regular, color: rgb(0.30, 0.37, 0.32) });
  };

  /**
   * An engineering memoir has to state, on its own pages, the units it uses, the sign
   * convention behind every N-V-M figure, what the analysis does and does not cover, and
   * any warning the solver raised. Until 0.8.1 the document jumped straight from the
   * executive page to the diagrams and left all of that implicit.
   */
  const drawScopePage = (): void => {
    newPage();
    drawVisualHeader('Unidades y convenciones', 'Como debe leerse este documento');
    drawSectionBand('05', 'Unidades y convenciones', 'Base de lectura de todas las cifras del documento');
    y = 700;

    heading('Unidades de presentacion');
    const units = project.settings.units;
    for (const [label, quantity] of [
      ['Longitud y desplazamiento', 'length'],
      ['Fuerza y reaccion', 'force'],
      ['Momento', 'moment'],
      ['Carga distribuida', 'distributedForce'],
    ] as const) {
      row(label, unitLabel(units, quantity));
    }
    row('Rotacion', 'rad');
    row('Precision interna', 'doble precision IEEE-754; el redondeo es solo de presentacion');
    row('Cero mostrado', 'un valor por debajo de la tolerancia relativa del solver se presenta como 0');

    heading('Convenciones de signo');
    text('+X apunta a la derecha y +Y hacia arriba. El eje local x de cada miembro va del nodo i al nodo j, y el eje local y gira 90 grados en sentido antihorario respecto de x.', 8.7);
    row('N axial', 'positivo en traccion, segun el eje local x del miembro');
    row('V cortante', 'positivo segun el eje local y del miembro');
    row('M momento', 'positivo cuando tracciona la fibra del lado local -y');
    row('Reacciones', 'expresadas en ejes globales, con el signo de la fuerza que el apoyo ejerce sobre la estructura');
    row('Deformada', 'desplazamientos nodales en ejes globales; la escala del dibujo es ilustrativa');

    heading('Alcance del analisis');
    row('Formulacion', analysis.educationTrace?.formulation ?? 'analisis estatico lineal 2D');
    row('Elemento de marco', 'Euler-Bernoulli con deformacion axial y flexion');
    row('Elemento de armadura', 'rigidez axial exclusivamente');
    row('Hipotesis', 'comportamiento elastico lineal, pequenas deformaciones y propiedades prismaticas por miembro');

    heading('Limitaciones declaradas');
    for (const limitation of [
      'No se consideran efectos de segundo orden (P-Delta) ni no linealidad geometrica.',
      'No se considera plasticidad, fluencia, fisuracion ni degradacion de rigidez.',
      'No se realiza analisis modal, dinamico, de historia en el tiempo ni espectral.',
      'No se aplica ninguna norma de diseno: el documento reporta solicitaciones, no verificaciones normativas.',
      'El pandeo, la torsion fuera del plano y el comportamiento tridimensional quedan fuera del modelo 2D.',
      'Los resultados dependen enteramente del modelo introducido; su idoneidad es responsabilidad del ingeniero que firma.',
    ]) {
      text(`- ${limitation}`, 8.5, regular, rgb(0.24, 0.28, 0.34), 10);
    }

    heading('Advertencias del analisis');
    if (analysis.issues.length === 0) {
      text('Las comprobaciones de entrada, estabilidad y equilibrio no detectaron incidencias.', 8.7, regular, rgb(0.10, 0.35, 0.22), 10);
    } else {
      for (const issue of analysis.issues) {
        const severity = issue.severity === 'error' ? 'ERROR' : issue.severity === 'warning' ? 'AVISO' : 'INFO';
        const color = issue.severity === 'error' ? rgb(0.75, 0.20, 0.16) : issue.severity === 'warning' ? rgb(0.62, 0.42, 0.05) : rgb(0.24, 0.28, 0.34);
        text(`[${severity}] ${issue.title}${issue.objectId ? ` (${issue.objectId})` : ''}: ${issue.message}`, 8.5, regular, color, 10);
        if (issue.suggestedFix) text(`Solucion sugerida: ${issue.suggestedFix}`, 8, regular, rgb(0.37, 0.43, 0.39), 20);
      }
    }
  };

  drawExecutivePage();
  drawQuantityPage('axial', '02');
  drawQuantityPage('shear', '03');
  drawQuantityPage('moment', '04');
  drawScopePage();
  drawProcedureSummary();
  newPage();
  heading('Anexo tecnico verificable');
  text(`Expediente portable v${payload.formatVersion} - app ${payload.provenance.appVersion}. Integridad SHA-256: ${payload.checksum.value}`, 8.3);
  text('Este anexo conserva el proyecto, las operaciones completas y los resultados exactos. El adjunto JSON permite reimportar el expediente sin OCR.', 8.3);
  heading('1. Resumen del proyecto');
  row('Estado del analisis', analysis.success ? 'resuelto' : 'con errores');
  row('Modelo', `${project.nodes.length} nodos, ${project.members.length} miembros`);
  row('Cargas', `${payload.metadata.loadCount} acciones; ${project.loadCases.length} casos; ${project.combinations.length} combinaciones`);
  row('Factores del escenario', project.loadCases.map((loadCase) => `${loadCase.id}=${number(scenarioFactors[loadCase.id] ?? 0)}`).join(', ') || 'sin casos');
  row('Formulacion', analysis.educationTrace?.formulation ?? 'analisis estatico lineal 2D');
  row('Norma residual', number(analysis.residualNorm));
  row('Estimacion de condicion', number(analysis.conditionEstimate));
  // These sums are meant to close at zero. Printing one of them as `0` and the next as
  // `-1.06581e-14` says nothing about the structure, only about which float happened to
  // land exactly on zero. They collapse against the applied load; the normalized residual
  // right after keeps the audit trail at full precision.
  const equilibriumScale = Math.max(
    Math.abs(analysis.loadAudit?.source.fx ?? 0),
    Math.abs(analysis.loadAudit?.source.fy ?? 0),
    1,
  );
  const equilibriumMomentScale = Math.max(Math.abs(analysis.loadAudit?.source.mz ?? 0), 1);
  row('Equilibrio', `Fx=${clearNumber(analysis.equilibrium.sumFx, equilibriumScale)}, Fy=${clearNumber(analysis.equilibrium.sumFy, equilibriumScale)}, M=${clearNumber(analysis.equilibrium.sumM, equilibriumMomentScale)}; residuo=${number(analysis.equilibrium.normalizedResidual)}`);
  if (analysis.loadAudit) {
    const reference = analysis.loadAudit.referencePoint;
    const critical = analysis.loadAudit.memberAudits.reduce<typeof analysis.loadAudit.memberAudits[number] | undefined>(
      (best, audit) => !best || audit.normalizedResidual > best.normalizedResidual ? audit : best,
      undefined,
    );
    const auditForce = (value: number) => clearNumber(value, equilibriumScale);
    const auditMoment = (value: number) => clearNumber(value, equilibriumMomentScale);
    row('Auditoria independiente de cargas', `origen O=${reference ? `(${number(reference.x)}, ${number(reference.y)})` : 'no disponible'}; fuente Fx=${auditForce(analysis.loadAudit.source.fx)}, Fy=${auditForce(analysis.loadAudit.source.fy)}, M_O=${auditMoment(analysis.loadAudit.source.mz)}; ensamblaje Fx=${auditForce(analysis.loadAudit.assembled.fx)}, Fy=${auditForce(analysis.loadAudit.assembled.fy)}, M_O=${auditMoment(analysis.loadAudit.assembled.mz)}; residuo global=${number(analysis.loadAudit.resultantResidual)}; residuo maximo=${number(analysis.loadAudit.normalizedResidual)}${critical ? ` en ${critical.memberId}` : ''}`);
  }
  if (analysis.issues.length) {
    heading('Incidencias', 2);
    for (const issue of analysis.issues) text(`[${issue.severity.toUpperCase()}] ${issue.title}: ${issue.message}`, 8.5, regular, undefined, 8);
  }

  heading('2. DCL, geometria y acciones');
  drawGlobalDcl();
  heading('Nodos y apoyos', 2);
  for (const node of project.nodes) {
    row(node.id, `x=${display(project, node.x, 'length')}, y=${display(project, node.y, 'length')}; apoyo=${node.support.type}${node.internalHinge ? '; articulacion interna' : ''}`);
  }
  heading('Miembros', 2);
  for (const member of project.members) {
    row(member.id, `${member.i} -> ${member.j}; ${member.type}; E=${number(member.E)} kN/m^2; A=${number(member.A)} m^2; I=${number(member.I)} m^4`);
  }
  heading('Cargas nodales', 2);
  if (!project.nodalLoads.length) text('Sin cargas nodales.', 8.7, regular, undefined, 8);
  for (const load of project.nodalLoads) {
    row(load.id, `nodo ${load.nodeId}, caso ${load.caseId}, factor=${number(scenarioFactors[load.caseId] ?? 0)}; Fx=${display(project, load.fx, 'force')}, Fy=${display(project, load.fy, 'force')}, Mz=${display(project, load.mz, 'moment')}`);
  }
  heading('Cargas de miembro', 2);
  if (!project.memberLoads.length) text('Sin cargas de miembro.', 8.7, regular, undefined, 8);
  for (const load of project.memberLoads) {
    row(load.id, `${load.type} en ${load.memberId}, caso ${load.caseId}, factor=${number(scenarioFactors[load.caseId] ?? 0)}, ejes ${load.coordinateSystem}; ${memberLoadDescription(project, load)}`);
  }
  if (analysis.loadAudit?.memberAudits.length) {
    heading('Auditoria por trabajo virtual', 2);
    text('Cada vector local [Fxi, Fyi, Mi, Fxj, Fyj, Mj] se reintegra desde las cargas fuente con funciones cerradas independientes, antes de liberaciones o condensacion.', 8.7, regular, undefined, 8);
    for (const audit of analysis.loadAudit.memberAudits) {
      row(audit.memberId, `L fuente=${number(audit.flexibleLength.source)}, L ensamblada=${number(audit.flexibleLength.assembled)}; residuo mecanico=${number(audit.mechanical.normalizedResidual)}, inicial=${number(audit.initial.normalizedResidual)}, total=${number(audit.normalizedResidual)}`);
    }
  }

  heading('3. Reacciones y desplazamientos');
  if (!analysis.nodeResults.length) text('No hay resultados nodales.', 8.7, regular, undefined, 8);
  // Each family collapses against its own governing magnitude across the model, so a
  // displacement of 1e-37 m reads as 0 instead of as a measurable movement.
  const extreme = (pick: (entry: typeof analysis.nodeResults[number]) => number) =>
    Math.max(1e-12, ...analysis.nodeResults.map((entry) => Math.abs(pick(entry))));
  const reactionScale = Math.max(extreme((entry) => entry.rx), extreme((entry) => entry.ry));
  const nodalMomentScale = extreme((entry) => entry.rm);
  const displacementScale = Math.max(extreme((entry) => entry.ux), extreme((entry) => entry.uy));
  const rotationScale = extreme((entry) => entry.rz);
  for (const result of analysis.nodeResults) {
    const reactions = [
      `Rx=${clearDisplay(project, result.rx, 'force', reactionScale)}`,
      `Ry=${clearDisplay(project, result.ry, 'force', reactionScale)}`,
      `M=${clearDisplay(project, result.rm, 'moment', nodalMomentScale)}`,
    ].join(', ');
    const displacements = [
      `Ux=${clearDisplay(project, result.ux, 'length', displacementScale)}`,
      `Uy=${clearDisplay(project, result.uy, 'length', displacementScale)}`,
      `Rz=${clearNumber(result.rz, rotationScale)} rad`,
    ].join(', ');
    row(result.nodeId, `${reactions}; ${displacements}`);
  }

  heading('4. Diagramas N, V y M');
  text('Los extremos se obtienen de los segmentos polinomicos exactos y puntos criticos del motor; el attachment conserva todas las funciones, saltos y muestras.', 8.7);
  if (!analysis.memberResults.length) text('No hay resultados de miembros.', 8.7, regular, undefined, 8);
  for (const result of analysis.memberResults) {
    ensure(145);
    heading(`Miembro ${result.memberId}`, 2);
    // The annex used raw `display`, so a beam with no axial load reported
    // "min=1.53081e-16 kip" while page 1 correctly reported 0. Both now collapse against
    // the governing magnitude of the same member, so the document does not contradict itself.
    const forceScale = Math.max(
      Math.abs(result.maxShear), Math.abs(result.minShear),
      Math.abs(result.maxAxial), Math.abs(result.minAxial), 1e-12,
    );
    const momentScale = Math.max(Math.abs(result.maxMoment), Math.abs(result.minMoment), 1e-12);
    const forceText = (value: number) => clearDisplay(project, value, 'force', forceScale);
    const momentText = (value: number) => clearDisplay(project, value, 'moment', momentScale);
    row('N axial', `min=${forceText(result.minAxial)}; max=${forceText(result.maxAxial)}`);
    row('V cortante', `min=${forceText(result.minShear)}; max=${forceText(result.maxShear)}`);
    row('M momento', `min=${momentText(result.minMoment)}; max=${momentText(result.maxMoment)}`);
    // `localEndForces` is [Fxi, Fyi, Mi, Fxj, Fyj, Mj] in base units. It used to be printed
    // bare, so the same page stated forces in kip on one line and in kN on the next with no
    // label at all. Each component is now converted and labelled.
    row('Extremos locales', result.localEndForces
      .map((entry, position) => {
        const label = ['Fx_i', 'Fy_i', 'M_i', 'Fx_j', 'Fy_j', 'M_j'][position] ?? `q${position}`;
        const isMoment = position === 2 || position === 5;
        return `${label}=${isMoment ? momentText(entry) : forceText(entry)}`;
      })
      .join(', '));
    const critical = result.criticalPoints
      .slice(0, 18)
      .map((point) => `${point.quantity}@${display(project, point.x, 'length')}=${point.quantity === 'moment' ? momentText(point.value) : forceText(point.value)} (${point.kind})`)
      .join('; ');
    if (critical) row('Puntos criticos', critical);
    for (const [segmentIndex, segment] of result.diagramSegments.entries()) {
      const station = `${display(project, segment.x0, 'length')} -> ${display(project, segment.x1, 'length')}`;
      row(
        `Tramo ${segmentIndex + 1}`,
        `${station}; N(s)=${formatPolynomial(project, 'axial', segment.axial)}; V(s)=${formatPolynomial(project, 'shear', segment.shear)}; M(s)=${formatPolynomial(project, 'moment', segment.moment)}; s=x-x0`,
      );
    }
    drawMemberDiagrams(result);
  }

  heading('5. Procedimiento y calculos');
  if (!analysis.explanation.length) text('El analisis no incluyo pasos explicativos.', 8.7, regular, undefined, 8);
  for (const [index, step] of analysis.explanation.entries()) {
    heading(`${index + 1}. ${step.title.replace(/^\d+\.\s*/, '')}`, 2);
    text(step.summary, 8.7, regular, undefined, 8);
    for (const equation of step.equations) text(`- ${equation}`, 8.3, regular, rgb(0.24, 0.28, 0.34), 16);
    // The values come from the engine, but the formatting is ours. Within one step,
    // entries sharing a unit are comparable, so each collapses against the largest of its
    // own family: an equilibrium sum of -1.06581e-14 kN beside a load of 22 kN is zero.
    const formatEntries = (entries: readonly { label: string; value: number; unit: string }[]): string => {
      const scaleByUnit = new Map<string, number>();
      for (const entry of entries) {
        scaleByUnit.set(entry.unit, Math.max(scaleByUnit.get(entry.unit) ?? 1e-12, Math.abs(entry.value)));
      }
      return entries
        .map((entry) => `${entry.label}=${clearNumber(entry.value, scaleByUnit.get(entry.unit) ?? 1)} ${entry.unit}`)
        .join('; ');
    };
    if (step.inputs?.length) row('Entradas', formatEntries(step.inputs));
    if (step.outputs?.length) row('Resultados', formatEntries(step.outputs));
  }

  if (options.includeEducationTrace !== false && analysis.educationTrace) {
    const trace = analysis.educationTrace;
    heading('6. Traza educativa y matrices');
    row('Esquema', `v${trace.schemaVersion}; ${trace.formulation}`);
    row('Grados de libertad', `${trace.dofs.length}; ${trace.dofs.filter((dof) => dof.constrained).length} restringidos`);
    row('Energia de deformacion', number(trace.assembly.strainEnergy));
    text(matrixSummary('Matriz global K', trace.assembly.stiffness), 8.2, regular, undefined, 8);
    text(matrixSummary('Matriz de restricciones C', trace.assembly.constraintMatrix), 8.2, regular, undefined, 8);
    for (const element of trace.elements) {
      heading(`Elemento ${element.memberId}`, 2);
      row('Geometria', `L=${number(element.length)} m, c=${number(element.c)}, s=${number(element.s)}`);
      text(matrixSummary('Transformacion', element.transformation), 8.1, regular, undefined, 8);
      text(matrixSummary('Rigidez local efectiva', element.localStiffnessEffective), 8.1, regular, undefined, 8);
      text(matrixSummary('Contribucion global', element.globalStiffnessContribution), 8.1, regular, undefined, 8);
    }
  }

  for (const [index, reportPage] of pages.entries()) {
    reportPage.drawLine({ start: { x: MARGIN, y: 36 }, end: { x: A4[0] - MARGIN, y: 36 }, thickness: 0.5, color: rgb(0.78, 0.81, 0.85) });
    reportPage.drawText(`structureCo - memoria de calculo | pagina ${index + 1} de ${pages.length}`, { x: MARGIN, y: 20, size: 7.5, font: regular, color: rgb(0.36, 0.40, 0.45) });
  }

  pdf.setTitle(pdfText(`${project.name} - memoria de calculo structureCo`));
  pdf.setAuthor('structureCo');
  pdf.setSubject('Modelo, DCL, diagramas N-V-M, resultados y procedimiento estructural');
  pdf.setKeywords(['structureCo', 'calculo estructural', 'DCL', 'NVM', payload.checksum.value]);
  const attachment = new TextEncoder().encode(serializePortablePayload(payload, true));
  const attachmentDate = new Date(payload.provenance.generatedAt);
  await pdf.attach(attachment, STRUCTURECO_PAYLOAD_FILENAME, {
    mimeType: STRUCTURECO_PAYLOAD_MIME,
    description: 'Proyecto y resultados exactos para reimportacion en structureCo',
    creationDate: Number.isNaN(attachmentDate.valueOf()) ? new Date() : attachmentDate,
    modificationDate: Number.isNaN(attachmentDate.valueOf()) ? new Date() : attachmentDate,
  });
  const bytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  return { bytes, filename: `${safeFilename(project.name)}-memoria-calculo.pdf`, payload };
};

export const createCalculationReportBlob = async (
  project: ProjectModel,
  analysis: AnalysisResult,
  options?: CalculationReportOptions,
): Promise<Blob> => {
  const report = await createCalculationReport(project, analysis, options);
  return new Blob([report.bytes as BlobPart], { type: 'application/pdf' });
};
