/**
 * Command Palette · aceleración, nunca puerta única (CRI-11 §9, CRI-9 D-09).
 *
 * `Ctrl/⌘+K` la abre desde cualquier pantalla del Workspace. Cada resultado
 * invoca el MISMO `commandId` que el botón visible o la acción contextual —
 * `commandsViolatingParity()` en `core/commands.ts` es la prueba de que
 * ninguna capacidad vive sólo aquí.
 *
 * Ranking (CRI-11 §9): 1) compatible con la selección actual, 2) coincidencia
 * textual, 3) el resto. No hay «recientes»: rastrearlos exigiría persistir
 * historial de uso, que este harness no modela — el hueco se declara en el
 * reporte, no se finge.
 *
 * SHL-06 («navegar a un nudo o barra por identificador») vive aquí: si el
 * texto escrito coincide con un ID del modelo efectivo, aparece como
 * resultado de localización aunque no sea un comando de la tabla.
 */

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Evidence } from '../core/analysis';
import { COMMANDS, isCommandAvailable, type CommandId, type CommandSpec } from '../core/commands';
import { useActions, usePrototype } from '../state/PrototypeStore';

const EVIDENCE_COMMAND: Partial<Record<CommandId, Evidence>> = {
  'view.evidence.none': 'none',
  'view.evidence.N': 'N',
  'view.evidence.V': 'V',
  'view.evidence.M': 'M',
  'view.evidence.deformed': 'deformed',
};

interface Entry {
  key: string;
  label: string;
  hint?: string;
  run: () => void;
}

export const CommandPalette = () => {
  const { state, derived, dispatch } = usePrototype();
  const { closeSurface, invoke, selectOne, locate, undo, redo, deleteSelected, setTool } = useActions();
  const { t, composition, model, commandContext } = derived;
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const compact = composition === 'K0';

  const runCommand = (command: CommandSpec) => {
    invoke(command.id, 'palette');
    switch (command.id) {
      case 'history.undo':
        undo();
        break;
      case 'history.redo':
        redo();
        break;
      case 'selection.delete':
        deleteSelected();
        break;
      case 'selection.locate': {
        const ref = derived.primarySelection;
        if (ref) locate(ref);
        break;
      }
      case 'analysis.solve':
        dispatch({ type: 'analysis/start' });
        break;
      case 'draft.commit':
        dispatch({ type: 'draft/commit' });
        break;
      case 'draft.cancel':
        dispatch({ type: 'draft/cancel' });
        break;
      case 'workspace.back':
        dispatch({ type: 'screen/welcome' });
        break;
      case 'surface.view.toggle':
        dispatch({ type: 'surface/open', surface: 'view', composition, invoker: 'palette' });
        break;
      case 'surface.dense.toggle':
        dispatch({ type: 'surface/open', surface: 'dense', composition, invoker: 'palette' });
        break;
      case 'surface.doctor.toggle':
        dispatch({ type: 'surface/open', surface: 'doctor', composition, invoker: 'palette' });
        break;
      case 'surface.preferences.toggle':
        dispatch({ type: 'surface/open', surface: 'preferences', composition, invoker: 'palette' });
        break;
      case 'surface.output.toggle':
        dispatch({ type: 'surface/open', surface: 'output', composition, invoker: 'palette' });
        break;
      case 'surface.recovery.toggle':
        dispatch({ type: 'surface/open', surface: 'recovery', composition, invoker: 'palette' });
        break;
      case 'surface.analysisSetup.toggle':
        dispatch({ type: 'surface/open', surface: 'analysis-setup', composition, invoker: 'palette' });
        break;
      case 'mode.toggle':
        dispatch({ type: 'axis/set', patch: { mode: state.axes.mode === 'essential' ? 'complete' : 'essential' } });
        break;
      case 'theme.toggle':
        dispatch({ type: 'axis/set', patch: { theme: state.axes.theme === 'light' ? 'dark' : 'light' } });
        break;
      case 'locale.toggle':
        dispatch({ type: 'axis/set', patch: { locale: state.axes.locale === 'es-MX' ? 'en-US' : 'es-MX' } });
        break;
      case 'tool.select':
        setTool('select');
        break;
      case 'tool.node':
        setTool('node');
        break;
      case 'tool.member':
        setTool('member');
        break;
      case 'tool.support':
        setTool('support');
        break;
      case 'tool.load':
        setTool('load');
        break;
      case 'canvas.zoomIn':
        dispatch({ type: 'camera/zoomBy', factor: 1.2 });
        break;
      case 'canvas.zoomOut':
        dispatch({ type: 'camera/zoomBy', factor: 1 / 1.2 });
        break;
      case 'canvas.resetView':
        dispatch({ type: 'camera/reset' });
        break;
      case 'member.changeSection': {
        const ref = derived.primarySelection;
        if (ref?.kind === 'member') dispatch({ type: 'surface/open', surface: 'detail', composition, invoker: 'palette' });
        break;
      }
      default: {
        const evidence = EVIDENCE_COMMAND[command.id];
        if (evidence) dispatch({ type: 'evidence/set', evidence });
        break;
      }
    }
    closeSurface('palette');
  };

  const entries = useMemo<Entry[]>(() => {
    const normalized = query.trim().toUpperCase();
    const available = COMMANDS.filter((command) => isCommandAvailable(command, commandContext));

    const idMatch = normalized
      ? [...model.nodes, ...model.members].filter((entity) => entity.id.toUpperCase().includes(normalized))
      : [];

    const commandEntries: (Entry & { rank: number })[] = available
      .filter((command) => !normalized || t(command.labelKey).toUpperCase().includes(normalized) || command.id.includes(normalized.toLowerCase()))
      .map((command) => {
        const contextual = command.requiresSelection || command.requiresMemberSelection;
        return {
          key: command.id,
          label: t(command.labelKey),
          hint: command.shortcut,
          rank: contextual ? 0 : normalized ? 1 : 2,
          run: () => runCommand(command),
        };
      });

    const locateEntries: (Entry & { rank: number })[] = idMatch.slice(0, 6).map((entity) => ({
      key: `locate-${entity.id}`,
      label: `${t('palette.locate')} ${entity.id}`,
      rank: -1,
      run: () => {
        invoke('selection.locate', 'palette');
        const kind = 'i' in entity ? 'member' : 'node';
        selectOne({ kind: kind as 'member' | 'node', id: entity.id });
        dispatch({ type: 'camera/reset' });
        closeSurface('palette');
      },
    }));

    return [...locateEntries, ...commandEntries].sort((a, b) => a.rank - b.rank).map(({ rank: _rank, ...entry }) => entry);
  }, [query, commandContext, model, t]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(entries.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      entries[activeIndex]?.run();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      closeSurface('palette');
    }
  };

  return (
    <div className="pt-palette-scrim" onClick={() => closeSurface('palette')}>
      <div className="pt-palette" data-compact={compact || undefined} role="dialog" aria-label={t('command.palette')} onClick={(event) => event.stopPropagation()}>
        <input
          autoFocus
          className="pt-palette__input"
          type="text"
          placeholder={t('palette.placeholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          aria-activedescendant={entries[activeIndex] ? `palette-${entries[activeIndex].key}` : undefined}
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
        />
        <ul className="pt-palette__list" id="palette-list" ref={listRef} role="listbox">
          {entries.length === 0 ? <li className="pt-palette__empty">{t('palette.empty')}</li> : null}
          {entries.map((entry, index) => (
            <li key={entry.key}>
              <button
                type="button"
                id={`palette-${entry.key}`}
                role="option"
                aria-selected={index === activeIndex}
                className="pt-palette__option"
                data-active={index === activeIndex || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={entry.run}
              >
                <span>{entry.label}</span>
                {entry.hint ? <span className="pt-palette__hint">{entry.hint}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <p className="pt-palette__footer">{t('palette.hint')}</p>
      </div>
    </div>
  );
};
