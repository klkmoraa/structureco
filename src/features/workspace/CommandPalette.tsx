import { useCallback, useEffect, useId, useMemo, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Command, Search, X } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import type { TranslationKey } from '../../i18n/catalogs';
import { useProject } from '../../store/ProjectContext';
import { buildCommands, type CommandCategory, type CommandContext, type CommandListItem } from './commandRegistry';
import type { EditorLayerAction } from '../canvas/editorLayers';
import type { SurfacePresentation } from './surfacePresentation';
import { recordLocalMetric } from '../../analytics/localMetrics';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  dispatchLayers: Dispatch<EditorLayerAction>;
  presentation?: Extract<SurfacePresentation, 'overlay' | 'sheet'>;
}

const GROUP_LABEL_KEYS: Record<CommandCategory, TranslationKey> = {
  tools: 'palette.groupTools',
  view: 'palette.groupView',
  results: 'palette.groupResults',
  analysis: 'palette.groupAnalysis',
  navigate: 'palette.groupNavigate',
  export: 'palette.groupExport',
};

const GROUP_ORDER: readonly CommandCategory[] = ['analysis', 'tools', 'navigate', 'results', 'view', 'export'];

/** Coincidencia por subcadena sobre etiqueta, pista y sinónimos, sin acentos ni mayúsculas. */
const normalize = (value: string) => value
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '');

/**
 * Paleta de comandos (Ctrl/⌘ + K).
 *
 * No construye su propia lista de comandos: proyecta `commandRegistry`
 * (CRI-103), la misma fuente que alimenta los botones visibles y los atajos
 * de teclado. Su valor está en alcanzar esos comandos con el teclado sin
 * recordar dónde vive cada control, y en poder saltar a un nudo o una barra
 * por su identificador — la única parte que sigue siendo contenido propio de
 * la paleta, porque es dato del proyecto, no un comando fijo.
 */
export const CommandPalette = ({ open, onClose, dispatchLayers, presentation = 'overlay' }: CommandPaletteProps) => {
  const {
    project, analysis, theme, canUndo, canRedo, isAnalyzing, selection,
    setActiveTool, setSelection, setResultTab, setTheme, updateProjectView, analyze, undo, redo,
  } = useProject();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingCommand, setPendingCommand] = useState<CommandListItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reviewConfirmRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const titleId = useId();
  const lastRecordedEmptyQuery = useRef<string | null>(null);

  const close = useCallback(() => {
    setPendingCommand(null);
    onClose();
  }, [onClose]);

  const context = useMemo<CommandContext>(() => ({
    t,
    project,
    hasAnalysis: Boolean(analysis),
    isAnalyzing,
    canUndo,
    canRedo,
    classroomMode: project.settings.calculationMode === 'classroom',
    selection,
    theme,
    setActiveTool,
    setSelection,
    setResultTab,
    setTheme,
    updateProjectView,
    dispatchLayers,
    analyze,
    undo,
    redo,
  }), [
    t, project, analysis, isAnalyzing, canUndo, canRedo, theme, selection,
    setActiveTool, setSelection, setResultTab, setTheme, updateProjectView, dispatchLayers, analyze, undo, redo,
  ]);

  const commands = useMemo<CommandListItem[]>(() => buildCommands(context), [context]);

  /** Ejecuta un comando de la paleta: la cierra y, si abre una superficie que
   *  monta al abrirse, difiere el efecto un frame para no competir con el
   *  cierre/restauración de foco de la propia paleta. */
  const execute = useCallback((command: CommandListItem) => {
    if (command.requiresConfirmation) {
      setPendingCommand(command);
      return;
    }
    if (command.deferredOpen) {
      close();
      window.requestAnimationFrame(() => command.run());
      return;
    }
    command.run();
    close();
  }, [close]);

  const confirmPendingCommand = useCallback(() => {
    if (!pendingCommand) return;
    pendingCommand.run();
    close();
  }, [close, pendingCommand]);

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return commands;
    return commands.filter((command) =>
      normalize(command.label).includes(needle)
      || (command.hint ? normalize(command.hint).includes(needle) : false)
      || command.aliases?.some((alias) => normalize(alias).includes(needle)));
  }, [commands, query]);

  const enabled = useMemo(() => matches.filter((command) => !command.disabled), [matches]);

  useEffect(() => setActiveIndex(0), [query, open]);

  useEffect(() => {
    const normalizedQuery = normalize(query.trim());
    if (!open || !normalizedQuery || matches.length || lastRecordedEmptyQuery.current === normalizedQuery) return;
    // Only the fact that search had no match is retained locally; the query
    // itself can be model-specific text and is deliberately never recorded.
    recordLocalMetric(window.localStorage, { name: 'command_search_empty' });
    lastRecordedEmptyQuery.current = normalizedQuery;
  }, [matches.length, open, query]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!pendingCommand) return;
    window.requestAnimationFrame(() => reviewConfirmRef.current?.focus());
  }, [pendingCommand]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-palette-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, matches, open]);

  if (!open) return null;

  const move = (delta: number) => {
    if (enabled.length === 0) return;
    setActiveIndex((current) => (current + delta + enabled.length) % enabled.length);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    else if (event.key === 'Home') { event.preventDefault(); setActiveIndex(0); }
    else if (event.key === 'End') { event.preventDefault(); setActiveIndex(Math.max(0, enabled.length - 1)); }
    else if (event.key === 'Enter') { event.preventDefault(); const command = enabled[activeIndex]; if (command) execute(command); }
  };

  const activeCommandId = enabled[activeIndex]?.id;

  return <div
    className={`command-palette-backdrop command-palette-backdrop--${presentation}`}
    data-surface-presentation={presentation}
    role="presentation"
    onPointerDown={(event) => {
    if (event.target === event.currentTarget) close();
    }}>
    <div className="command-palette" data-workspace-surface="palette" role="dialog" aria-labelledby={titleId}>
      <header className="command-palette-head">
        <span className="command-palette-head__icon" aria-hidden="true"><Command size={17} /></span>
        <div>
          <span>{t('palette.openShort')}</span>
          <h2 id={titleId} className="command-palette-title">{t('palette.title')}</h2>
        </div>
        <button type="button" className="command-palette-close" aria-label={t('toolbar.close')} onClick={close}>
          <X size={16} />
        </button>
      </header>
      {pendingCommand ? <section className="command-palette-review" aria-labelledby={`${titleId}-review`}>
        <h3 id={`${titleId}-review`}>{t('palette.reviewTitle')}</h3>
        <strong>{pendingCommand.label}</strong>
        {pendingCommand.route ? <small>{pendingCommand.route}</small> : null}
        {pendingCommand.hint ? <p>{pendingCommand.hint}</p> : null}
        <p>{t('palette.reviewBody')}</p>
        <footer>
          <button type="button" onClick={() => setPendingCommand(null)}>{t('palette.reviewCancel')}</button>
          <button ref={reviewConfirmRef} type="button" onClick={confirmPendingCommand}>{t('palette.reviewConfirm')}</button>
        </footer>
      </section> : <><div className="command-palette-search">
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          data-surface-focus-key="command-query"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeCommandId ? `${listId}-${activeCommandId}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={t('palette.placeholder')}
          aria-label={t('palette.placeholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
        />
        <kbd aria-hidden="true">Esc</kbd>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {matches.length === 0
          ? t('palette.noResults', { query: query.trim() })
          : `${t('palette.resultCount', { count: matches.length })} ${activeCommandId ? t('palette.activeCommand', { label: enabled[activeIndex]?.label ?? '' }) : ''}`}
      </p>

      <div className="command-palette-list" id={listId} role="listbox" aria-label={t('palette.title')} ref={listRef}>
        {matches.length === 0 ? <p className="command-palette-empty">{t('palette.noResults', { query: query.trim() })}</p> : null}
        {GROUP_ORDER.map((group) => {
          const groupCommands = matches.filter((command) => command.category === group);
          if (groupCommands.length === 0) return null;
          return <section key={group} className="command-palette-group">
            <h3>{t(GROUP_LABEL_KEYS[group])}</h3>
            {groupCommands.map((command) => {
              const Icon = command.icon;
              const isActive = command.id === activeCommandId;
              return <button
                key={command.id}
                id={`${listId}-${command.id}`}
                type="button"
                role="option"
                /* Sin etiqueta explícita, el nombre accesible concatena
                   `strong`+`small`+`kbd` sin separación ("NodoN"). */
                aria-label={[command.label, command.route, command.hint, command.shortcut].filter(Boolean).join(' · ')}
                aria-selected={isActive}
                aria-disabled={command.disabled}
                data-palette-active={isActive}
                className={`command-palette-item${isActive ? ' is-active' : ''}`}
                disabled={command.disabled}
                onPointerEnter={() => {
                  const index = enabled.findIndex((candidate) => candidate.id === command.id);
                  if (index >= 0) setActiveIndex(index);
                }}
                onClick={() => execute(command)}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="command-palette-label">
                  <strong>{command.label}</strong>
                  {command.route ? <small className="command-palette-route">{command.route}</small> : null}
                  {command.hint ? <small>{command.hint}</small> : null}
                </span>
                {command.shortcut ? <kbd>{command.shortcut}</kbd> : null}
              </button>;
            })}
          </section>;
        })}
      </div>

      <footer className="command-palette-footer">
        <span>{t('palette.hintNavigate')}</span>
        <span>{selection && selection.kind !== 'multi' ? t('palette.currentSelection', { id: selection.id }) : t('palette.noSelection')}</span>
      </footer>
      </>}
    </div>
  </div>;
};
