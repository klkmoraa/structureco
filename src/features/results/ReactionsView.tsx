import { useMemo } from 'react';
import { Surface } from '../../design-system/components/surface';
import { resolveReliability } from '../../engine/reliability';
import { toDisplay, unitLabel } from '../../engine/units';
import { useI18n } from '../../i18n/useI18n';
import { useProject } from '../../store/ProjectContext';
import { ResultExtremeCard } from './ResultExtremeCard';
import { formatResultNearZero, formatResultNumber } from './resultFormatting';
import { isReactionDofConstrained, type ReactionDof } from './reactionPresentation';

/**
 * Reacciones — vista densa invocada (CRI-101).
 *
 * Los tres extremos van en tarjeta Clay `RAISED` con sus cinco datos; la tabla
 * completa sigue existiendo y sigue siendo comparable de un vistazo, sólo que
 * ahora **dentro** de una tarjeta que le hace de marco: la tabla es `BASE`, sin
 * sombra, sin celdas clay y sin canto redondeado por fila. Ninguna fila
 * dictamina: no hay check por fila, porque una fila no es un veredicto.
 */
export const ReactionsView = () => {
  const { analysis, project, selection, setSelection } = useProject();
  const { t } = useI18n();
  const units = project.settings.units;
  const lengthUnit = unitLabel(units, 'length');
  const forceUnit = unitLabel(units, 'force');
  const momentUnit = unitLabel(units, 'moment');
  const nodeResults = useMemo(() => analysis?.nodeResults ?? [], [analysis]);
  const reliability = analysis ? resolveReliability(analysis).level : 'failed';
  const reactionScales = useMemo(() => ({
    force: Math.max(1, ...nodeResults.flatMap((result) => [
      Math.abs(toDisplay(result.rx, units, 'force')),
      Math.abs(toDisplay(result.ry, units, 'force')),
    ])),
    moment: Math.max(1, ...nodeResults.map((result) => Math.abs(toDisplay(result.rm, units, 'moment')))),
    rotation: Math.max(1, ...nodeResults.map((result) => Math.abs(result.rz))),
  }), [nodeResults, units]);

  const formatReaction = (value: number, quantity: 'force' | 'moment') => formatResultNearZero(
    toDisplay(value, units, quantity),
    reactionScales[quantity],
  );
  const formatConstrainedDof = (value: number, quantity: 'length' | 'rotation', constrained: boolean) => {
    const displayValue = quantity === 'length' ? toDisplay(value, units, 'length') : value;
    return constrained
      ? formatResultNearZero(displayValue, quantity === 'length' ? 1 : reactionScales.rotation)
      : formatResultNumber(displayValue);
  };

  /**
   * Los extremos no dependen del cursor de resultados: se derivan una sola vez
   * del análisis y de las unidades, y se pasan a tarjetas memoizadas.
   */
  const extremes = useMemo(() => {
    type NodeResult = (typeof nodeResults)[number];
    const critical = (pick: (result: NodeResult) => number): NodeResult | null => nodeResults.reduce<NodeResult | null>(
      (best, result) => !best || Math.abs(pick(result)) > Math.abs(pick(best)) ? result : best,
      null,
    );
    const entries: Array<{
      id: string;
      symbol: string;
      nodeId: string;
      value: number;
      quantity: 'force' | 'moment';
    }> = [];
    const rx = critical((result) => result.rx);
    const ry = critical((result) => result.ry);
    const rm = critical((result) => result.rm);
    if (rx) entries.push({ id: 'rx', symbol: 'Rx', nodeId: rx.nodeId, value: rx.rx, quantity: 'force' });
    if (ry) entries.push({ id: 'ry', symbol: 'Ry', nodeId: ry.nodeId, value: ry.ry, quantity: 'force' });
    if (rm) entries.push({ id: 'rm', symbol: 'Mz', nodeId: rm.nodeId, value: rm.rm, quantity: 'moment' });
    return entries;
  }, [nodeResults]);

  return <div className="dense-reactions">
    <div className="result-extreme-grid">
      {extremes.map((extreme) => <ResultExtremeCard
        key={extreme.id}
        label={`${extreme.symbol} ${t('results.maximum')}`}
        value={formatReaction(extreme.value, extreme.quantity)}
        unit={extreme.quantity === 'moment' ? momentUnit : forceUnit}
        position={`${t('results.node')} ${extreme.nodeId}`}
        reliability={reliability}
        accent="reaction"
        onLocate={() => setSelection({ kind: 'node', id: extreme.nodeId })}
      />)}
    </div>
    <Surface as="section" level="raised" className="result-table-card" aria-label={t('results.reactionCaption')}>
      <div className="table-wrap">
        <table className="results-table">
          <caption>{t('results.reactionCaption')}</caption>
          <thead><tr><th scope="col">{t('results.node')}</th><th scope="col">Ux ({lengthUnit})</th><th scope="col">Uy ({lengthUnit})</th><th scope="col">Rz (rad)</th><th scope="col">Rx ({forceUnit})</th><th scope="col">Ry ({forceUnit})</th><th scope="col">Mz ({momentUnit})</th></tr></thead>
          <tbody>{nodeResults.map((result) => {
            const selected = selection?.kind === 'node' && selection.id === result.nodeId;
            const node = project.nodes.find((candidate) => candidate.id === result.nodeId);
            const constrained = (dof: ReactionDof) => Boolean(node && isReactionDofConstrained(node.support, dof));
            const constrainedCell = (dof: ReactionDof) => constrained(dof) ? 'true' : 'false';
            return <tr key={result.nodeId} aria-selected={selected || undefined}>
              <th scope="row"><button type="button" className="result-object-link" aria-pressed={selected} onClick={() => setSelection({ kind: 'node', id: result.nodeId })}>{result.nodeId}<span className="sr-only"> · {t('results.locateModel')}</span></button></th>
              <td data-constrained={constrainedCell('x')}>{formatConstrainedDof(result.ux, 'length', constrained('x'))}</td><td data-constrained={constrainedCell('y')}>{formatConstrainedDof(result.uy, 'length', constrained('y'))}</td><td data-constrained={constrainedCell('r')}>{formatConstrainedDof(result.rz, 'rotation', constrained('r'))}</td>
              <td data-constrained={constrainedCell('x')}>{formatReaction(result.rx, 'force')}</td>
              <td data-constrained={constrainedCell('y')}>{formatReaction(result.ry, 'force')}</td>
              <td data-constrained={constrainedCell('r')}>{formatReaction(result.rm, 'moment')}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </Surface>
  </div>;
};
