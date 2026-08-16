/**
 * Precision selector · fase 2 del contrato de selección precisa (D-06).
 *
 * Se arma con `press & hold` en táctil. El anillo aparece DESPLAZADO por
 * encima del punto de contacto real (el dedo nunca tapa lo que intenta
 * elegir) y resalta en vivo el candidato más cercano mientras el usuario
 * desliza. Soltar sobre un candidato lo compromete; soltar fuera cancela sin
 * tocar la selección previa (`StructuralCanvas` ya lo garantiza).
 */

import type { Candidate } from '../core/hitTest';
import { usePrototype } from '../state/PrototypeStore';

interface PrecisionCrosshairProps {
  x: number;
  y: number;
  candidate: Candidate | null;
}

export const PrecisionCrosshair = ({ x, y, candidate }: PrecisionCrosshairProps) => {
  const { derived } = usePrototype();
  const { t } = derived;
  const typeLabel = candidate ? (candidate.kind === 'node' ? t('toolrail.node') : t('toolrail.member')) : null;

  return (
    <div className="pt-precision" style={{ left: x, top: y - 40 }} aria-hidden="true">
      <span className="pt-precision__ring" data-armed={candidate ? 'true' : undefined} />
      {candidate ? (
        <span className="pt-precision__label">
          {typeLabel} · {candidate.id}
        </span>
      ) : (
        <span className="pt-precision__label pt-precision__label--empty">{t('precision.title')}</span>
      )}
    </div>
  );
};
