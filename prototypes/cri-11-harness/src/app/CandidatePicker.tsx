/**
 * Candidate picker · fase 3 del contrato de selección precisa (CRI-9 §9, D-06).
 *
 * Se abre SIEMPRE que `hitTest` encuentra más de un candidato — nunca se
 * elige en silencio. Cada fila lleva `tipo + ID + diferenciador`, como pide
 * CRI-11 §4. Cancelar (Escape o tocar fuera) no altera la selección previa.
 *
 * En Expanded/Medium es un popover cerca del punto de toque; en Compact es
 * una hoja baja — la misma lista, otra presentación, igual que el resto del
 * catálogo de superficies.
 *
 * Fase C completa la quinta fase que Fase B dejó pendiente: ciclar con
 * flechas antes de elegir. Foco itinerante (`roving tabindex`) sobre los
 * botones de la lista — ArrowDown/ArrowUp mueven el foco, Home/End saltan a
 * los extremos, Enter/Espacio comprometen por el `onClick` nativo del botón
 * enfocado. No hay estado de "candidato resaltado" aparte del foco del DOM:
 * es la misma fuente de verdad que ya usa `CommandPalette` para su lista.
 */

import { useEffect, useRef } from 'react';
import type { Candidate } from '../core/hitTest';
import { usePrototype } from '../state/PrototypeStore';

interface CandidatePickerProps {
  anchor: { x: number; y: number };
  candidates: Candidate[];
  containerWidth: number;
  containerHeight: number;
  onChoose: (candidate: Candidate) => void;
  onCancel: () => void;
}

export const CandidatePicker = ({ anchor, candidates, containerWidth, containerHeight, onChoose, onCancel }: CandidatePickerProps) => {
  const { derived } = usePrototype();
  const { t, composition } = derived;
  const listRef = useRef<HTMLUListElement | null>(null);
  const compact = composition === 'K0';

  useEffect(() => {
    listRef.current?.querySelector('button')?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
      const options = listRef.current ? Array.from(listRef.current.querySelectorAll<HTMLButtonElement>('button')) : [];
      if (options.length === 0) return;
      const current = options.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();
      event.stopPropagation();
      let next = current;
      if (event.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % options.length;
      else if (event.key === 'ArrowUp') next = current < 0 ? options.length - 1 : (current - 1 + options.length) % options.length;
      else if (event.key === 'Home') next = 0;
      else next = options.length - 1;
      options[next]?.focus();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [onCancel]);

  const typeLabel = (kind: Candidate['kind']) => (kind === 'node' ? t('toolrail.node') : t('toolrail.member'));

  const style = compact
    ? undefined
    : {
        left: Math.min(Math.max(12, anchor.x - 130), containerWidth - 292),
        top: Math.min(anchor.y + 12, containerHeight - 220),
      };

  return (
    <div className="pt-picker-scrim" onClick={onCancel}>
      <div
        className="pt-picker"
        data-compact={compact || undefined}
        style={style}
        role="dialog"
        aria-label={t('picker.title')}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="pt-picker__title">{t('picker.title')}</p>
        <p className="pt-picker__hint">{t('picker.hint')}</p>
        <ul className="pt-picker__list" ref={listRef}>
          {candidates.map((candidate) => (
            <li key={`${candidate.kind}-${candidate.id}`}>
              <button type="button" className="pt-picker__option" onClick={() => onChoose(candidate)}>
                <span className="pt-picker__type">{typeLabel(candidate.kind)}</span>
                <span className="pt-picker__id">{candidate.id}</span>
                {candidate.differentiator ? <span className="pt-picker__diff">{candidate.differentiator}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="sc-button sc-button--ghost sc-button--sm pt-picker__cancel" onClick={onCancel}>
          <span className="sc-button__label">{t('command.cancel')}</span>
        </button>
      </div>
    </div>
  );
};
