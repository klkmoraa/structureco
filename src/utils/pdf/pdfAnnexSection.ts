/**
 * Verifiable technical annex: project summary, model and actions, reactions and
 * displacements, exact N-V-M functions, procedure and — on request — the educational trace
 * with the assembled matrices.
 *
 * This is the part of the document the reviewer audits, so every figure states its unit and
 * collapses numeric noise against the governing magnitude of its own family.
 */
import { drawGlobalDcl, drawMemberDiagrams } from './pdfDiagrams';
import {
  clearDisplay,
  clearNumber,
  display,
  formatPolynomial,
  matrixSummary,
  memberLoadDescription,
  number,
} from './pdfFormat';
import type { ReportContext } from './reportContext';

export const drawTechnicalAnnex = (context: ReportContext): void => {
  const { layout, project, analysis, payload, options, scenarioFactors, index } = context;
  const { rgb, fonts } = layout;

  layout.newPage();
  layout.heading('Anexo tecnico verificable');
  layout.text(`Expediente portable v${payload.formatVersion} - app ${payload.provenance.appVersion}. Integridad SHA-256: ${payload.checksum.value}`, 8.3);
  layout.text('Este anexo conserva el proyecto, las operaciones completas y los resultados exactos. El adjunto JSON permite reimportar el expediente sin OCR.', 8.3);
  layout.heading('1. Resumen del proyecto');
  layout.row('Estado del analisis', analysis.success ? 'resuelto' : 'con errores');
  layout.row('Modelo', `${project.nodes.length} nodos, ${project.members.length} miembros`);
  layout.row('Cargas', `${payload.metadata.loadCount} acciones; ${project.loadCases.length} casos; ${project.combinations.length} combinaciones`);
  layout.row('Factores del escenario', project.loadCases.map((loadCase) => `${loadCase.id}=${number(scenarioFactors[loadCase.id] ?? 0)}`).join(', ') || 'sin casos');
  layout.row('Formulacion', analysis.educationTrace?.formulation ?? 'analisis estatico lineal 2D');
  layout.row('Norma residual', number(analysis.residualNorm));
  layout.row('Estimacion de condicion', number(analysis.conditionEstimate));
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
  layout.row('Equilibrio', `Fx=${clearNumber(analysis.equilibrium.sumFx, equilibriumScale)}, Fy=${clearNumber(analysis.equilibrium.sumFy, equilibriumScale)}, M=${clearNumber(analysis.equilibrium.sumM, equilibriumMomentScale)}; residuo=${number(analysis.equilibrium.normalizedResidual)}`);
  if (analysis.loadAudit) {
    const reference = analysis.loadAudit.referencePoint;
    const critical = analysis.loadAudit.memberAudits.reduce<typeof analysis.loadAudit.memberAudits[number] | undefined>(
      (best, audit) => !best || audit.normalizedResidual > best.normalizedResidual ? audit : best,
      undefined,
    );
    const auditForce = (value: number) => clearNumber(value, equilibriumScale);
    const auditMoment = (value: number) => clearNumber(value, equilibriumMomentScale);
    layout.row('Auditoria independiente de cargas', `origen O=${reference ? `(${number(reference.x)}, ${number(reference.y)})` : 'no disponible'}; fuente Fx=${auditForce(analysis.loadAudit.source.fx)}, Fy=${auditForce(analysis.loadAudit.source.fy)}, M_O=${auditMoment(analysis.loadAudit.source.mz)}; ensamblaje Fx=${auditForce(analysis.loadAudit.assembled.fx)}, Fy=${auditForce(analysis.loadAudit.assembled.fy)}, M_O=${auditMoment(analysis.loadAudit.assembled.mz)}; residuo global=${number(analysis.loadAudit.resultantResidual)}; residuo maximo=${number(analysis.loadAudit.normalizedResidual)}${critical ? ` en ${critical.memberId}` : ''}`);
  }
  if (analysis.issues.length) {
    layout.heading('Incidencias', 2);
    for (const issue of analysis.issues) layout.text(`[${issue.severity.toUpperCase()}] ${issue.title}: ${issue.message}`, 8.5, fonts.regular, undefined, 8);
  }

  layout.heading('2. DCL, geometria y acciones');
  drawGlobalDcl(context);
  layout.heading('Nodos y apoyos', 2);
  for (const node of project.nodes) {
    layout.row(node.id, `x=${display(project, node.x, 'length')}, y=${display(project, node.y, 'length')}; apoyo=${node.support.type}${node.internalHinge ? '; articulacion interna' : ''}`);
  }
  layout.heading('Miembros', 2);
  for (const member of project.members) {
    layout.row(member.id, `${member.i} -> ${member.j}; ${member.type}; E=${number(member.E)} kN/m^2; A=${number(member.A)} m^2; I=${number(member.I)} m^4`);
  }
  layout.heading('Cargas nodales', 2);
  if (!project.nodalLoads.length) layout.text('Sin cargas nodales.', 8.7, fonts.regular, undefined, 8);
  for (const load of project.nodalLoads) {
    layout.row(load.id, `nodo ${load.nodeId}, caso ${load.caseId}, factor=${number(scenarioFactors[load.caseId] ?? 0)}; Fx=${display(project, load.fx, 'force')}, Fy=${display(project, load.fy, 'force')}, Mz=${display(project, load.mz, 'moment')}`);
  }
  layout.heading('Cargas de miembro', 2);
  if (!project.memberLoads.length) layout.text('Sin cargas de miembro.', 8.7, fonts.regular, undefined, 8);
  for (const load of project.memberLoads) {
    layout.row(load.id, `${load.type} en ${load.memberId}, caso ${load.caseId}, factor=${number(scenarioFactors[load.caseId] ?? 0)}, ejes ${load.coordinateSystem}; ${memberLoadDescription(project, index, load)}`);
  }
  if (analysis.loadAudit?.memberAudits.length) {
    layout.heading('Auditoria por trabajo virtual', 2);
    layout.text('Cada vector local [Fxi, Fyi, Mi, Fxj, Fyj, Mj] se reintegra desde las cargas fuente con funciones cerradas independientes, antes de liberaciones o condensacion.', 8.7, fonts.regular, undefined, 8);
    for (const audit of analysis.loadAudit.memberAudits) {
      layout.row(audit.memberId, `L fuente=${number(audit.flexibleLength.source)}, L ensamblada=${number(audit.flexibleLength.assembled)}; residuo mecanico=${number(audit.mechanical.normalizedResidual)}, inicial=${number(audit.initial.normalizedResidual)}, total=${number(audit.normalizedResidual)}`);
    }
  }

  layout.heading('3. Reacciones y desplazamientos');
  if (!analysis.nodeResults.length) layout.text('No hay resultados nodales.', 8.7, fonts.regular, undefined, 8);
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
    layout.row(result.nodeId, `${reactions}; ${displacements}`);
  }

  layout.heading('4. Diagramas N, V y M');
  layout.text('Los extremos se obtienen de los segmentos polinomicos exactos y puntos criticos del motor; el attachment conserva todas las funciones, saltos y muestras.', 8.7);
  if (!analysis.memberResults.length) layout.text('No hay resultados de miembros.', 8.7, fonts.regular, undefined, 8);
  for (const result of analysis.memberResults) {
    layout.ensure(145);
    layout.heading(`Miembro ${result.memberId}`, 2);
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
    layout.row('N axial', `min=${forceText(result.minAxial)}; max=${forceText(result.maxAxial)}`);
    layout.row('V cortante', `min=${forceText(result.minShear)}; max=${forceText(result.maxShear)}`);
    layout.row('M momento', `min=${momentText(result.minMoment)}; max=${momentText(result.maxMoment)}`);
    // `localEndForces` is [Fxi, Fyi, Mi, Fxj, Fyj, Mj] in base units. It used to be printed
    // bare, so the same page stated forces in kip on one line and in kN on the next with no
    // label at all. Each component is now converted and labelled.
    layout.row('Extremos locales', result.localEndForces
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
    if (critical) layout.row('Puntos criticos', critical);
    for (const [segmentIndex, segment] of result.diagramSegments.entries()) {
      const station = `${display(project, segment.x0, 'length')} -> ${display(project, segment.x1, 'length')}`;
      layout.row(
        `Tramo ${segmentIndex + 1}`,
        `${station}; N(s)=${formatPolynomial(project, 'axial', segment.axial)}; V(s)=${formatPolynomial(project, 'shear', segment.shear)}; M(s)=${formatPolynomial(project, 'moment', segment.moment)}; s=x-x0`,
      );
    }
    drawMemberDiagrams(context, result);
  }

  layout.heading('5. Procedimiento y calculos');
  if (!analysis.explanation.length) layout.text('El analisis no incluyo pasos explicativos.', 8.7, fonts.regular, undefined, 8);
  for (const [stepIndex, step] of analysis.explanation.entries()) {
    layout.heading(`${stepIndex + 1}. ${step.title.replace(/^\d+\.\s*/, '')}`, 2);
    layout.text(step.summary, 8.7, fonts.regular, undefined, 8);
    for (const equation of step.equations) layout.text(`- ${equation}`, 8.3, fonts.regular, rgb(0.24, 0.28, 0.34), 16);
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
    if (step.inputs?.length) layout.row('Entradas', formatEntries(step.inputs));
    if (step.outputs?.length) layout.row('Resultados', formatEntries(step.outputs));
  }

  if (options.includeEducationTrace !== false && analysis.educationTrace) {
    const trace = analysis.educationTrace;
    layout.heading('6. Traza educativa y matrices');
    layout.row('Esquema', `v${trace.schemaVersion}; ${trace.formulation}`);
    layout.row('Grados de libertad', `${trace.dofs.length}; ${trace.dofs.filter((dof) => dof.constrained).length} restringidos`);
    layout.row('Energia de deformacion', number(trace.assembly.strainEnergy));
    layout.text(matrixSummary('Matriz global K', trace.assembly.stiffness), 8.2, fonts.regular, undefined, 8);
    layout.text(matrixSummary('Matriz de restricciones C', trace.assembly.constraintMatrix), 8.2, fonts.regular, undefined, 8);
    for (const element of trace.elements) {
      layout.heading(`Elemento ${element.memberId}`, 2);
      layout.row('Geometria', `L=${number(element.length)} m, c=${number(element.c)}, s=${number(element.s)}`);
      layout.text(matrixSummary('Transformacion', element.transformation), 8.1, fonts.regular, undefined, 8);
      layout.text(matrixSummary('Rigidez local efectiva', element.localStiffnessEffective), 8.1, fonts.regular, undefined, 8);
      layout.text(matrixSummary('Contribucion global', element.globalStiffnessContribution), 8.1, fonts.regular, undefined, 8);
    }
  }
};
