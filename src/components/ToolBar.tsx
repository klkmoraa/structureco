import {
  BoxSelect,
  ChevronRight,
  CircleDot,
  Component,
  Crosshair,
  Delete,
  GitCommitHorizontal,
  Hand,
  MousePointer2,
  MoreHorizontal,
  MoveDiagonal2,
  RotateCcw,
  Ruler,
  Scissors,
  Sigma,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '../store/ProjectContext';
import type { Tool } from '../types';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/catalogs';
import { STRUCTURAL_TOOL_IDS, StructuralToolIcon } from './StructuralToolIcon';

interface ToolDefinition {
  id: Tool;
  labelKey: TranslationKey;
  detailKey?: TranslationKey;
  icon: typeof MousePointer2;
  shortcut: string;
}

const tools: ToolDefinition[] = [
  { id: 'select', labelKey: 'toolbar.select', icon: MousePointer2, shortcut: 'V' },
  { id: 'pan', labelKey: 'toolbar.pan', detailKey: 'toolbar.panDetail', icon: Hand, shortcut: 'H' },
  { id: 'node', labelKey: 'toolbar.node', icon: CircleDot, shortcut: 'N' },
  { id: 'member', labelKey: 'toolbar.member', icon: GitCommitHorizontal, shortcut: 'M' },
  { id: 'support', labelKey: 'toolbar.support', icon: Component, shortcut: 'S' },
  { id: 'pointLoad', labelKey: 'toolbar.pointLoad', detailKey: 'toolbar.pointLoadDetail', icon: MoveDiagonal2, shortcut: 'P' },
  { id: 'distributedLoad', labelKey: 'toolbar.distributedLoad', detailKey: 'toolbar.distributedLoadDetail', icon: Sigma, shortcut: 'D' },
  { id: 'moment', labelKey: 'toolbar.moment', detailKey: 'toolbar.momentDetail', icon: RotateCcw, shortcut: 'O' },
  { id: 'dimension', labelKey: 'toolbar.dimension', detailKey: 'toolbar.dimensionDetail', icon: Ruler, shortcut: 'C' },
  { id: 'split', labelKey: 'toolbar.split', detailKey: 'toolbar.splitDetail', icon: Scissors, shortcut: 'B' },
  { id: 'cut', labelKey: 'toolbar.cut', detailKey: 'toolbar.cutDetail', icon: Crosshair, shortcut: 'X' },
  { id: 'delete', labelKey: 'toolbar.delete', detailKey: 'toolbar.deleteDetail', icon: Delete, shortcut: '⌫' },
];

const mobilePrimaryIds: Tool[] = ['select', 'node', 'member', 'support'];
const mobileLoadIds: Tool[] = ['pointLoad', 'distributedLoad', 'moment'];
const mobileMoreIds: Tool[] = ['pan', 'dimension', 'split', 'cut', 'delete'];

const ToolButton = ({
  definition,
  label,
  active,
  className = '',
  onSelect,
  menuItem = false,
}: {
  definition: ToolDefinition;
  label: string;
  active: boolean;
  className?: string;
  onSelect: (tool: Tool) => void;
  menuItem?: boolean;
}) => {
  const { id, icon: Icon, shortcut } = definition;
  return <button
    className={`tool-button tool-${id}${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
    onClick={() => onSelect(id)}
    title={`${label} (${shortcut})`}
    aria-label={`${label} (${shortcut})`}
    role={menuItem ? 'menuitemradio' : undefined}
    aria-checked={menuItem ? active : undefined}
    aria-pressed={menuItem ? undefined : active}
  >
    {STRUCTURAL_TOOL_IDS.has(id) ? <StructuralToolIcon tool={id} /> : <Icon size={22} strokeWidth={1.8} />}
    <span>{label}</span>
    <kbd>{shortcut}</kbd>
  </button>;
};

const PaletteToolButton = ({
  definition,
  label,
  detail,
  active,
  onSelect,
}: {
  definition: ToolDefinition;
  label: string;
  detail: string;
  active: boolean;
  onSelect: (tool: Tool) => void;
}) => {
  const { id, icon: Icon, shortcut } = definition;
  return <button
    className={`mobile-palette-tool tool-${id}${active ? ' active' : ''}`}
    onClick={() => onSelect(id)}
    aria-label={`${label}. ${detail}`}
    role="menuitemradio"
    aria-checked={active}
  >
    <span className="mobile-palette-icon" aria-hidden="true">
      {STRUCTURAL_TOOL_IDS.has(id) ? <StructuralToolIcon tool={id} /> : <Icon size={23} strokeWidth={1.8} />}
    </span>
    <span className="mobile-palette-copy"><strong>{label}</strong><small>{detail}</small></span>
    <ChevronRight size={19} aria-hidden="true" />
    <kbd>{shortcut}</kbd>
  </button>;
};

export const ToolBar = () => {
  const { activeTool, setActiveTool, project } = useProject();
  const [showMore, setShowMore] = useState(false);
  const [mobileMenu, setMobileMenu] = useState<'loads' | 'more' | null>(null);
  const loadMenuButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuButtonRef = useRef<HTMLButtonElement>(null);
  const paletteRef = useRef<HTMLElement>(null);
  const { t } = useI18n();
  const classroom = project.settings.calculationMode === 'classroom';
  const advancedTools: Tool[] = ['dimension', 'split', 'cut', 'delete'];
  const visibleTools = classroom && !showMore && !advancedTools.includes(activeTool)
    ? tools.filter((tool) => !advancedTools.includes(tool.id))
    : tools;
  const selectTool = (tool: Tool) => {
    setActiveTool(tool);
    setMobileMenu(null);
  };
  const mobilePrimaryTools = tools.filter((tool) => mobilePrimaryIds.includes(tool.id));
  const mobilePaletteTools = tools.filter((tool) => (mobileMenu === 'loads' ? mobileLoadIds : mobileMoreIds).includes(tool.id));
  const loadToolActive = mobileLoadIds.includes(activeTool);
  const moreToolActive = mobileMoreIds.includes(activeTool);
  const loadGroupHighlighted = mobileMenu ? mobileMenu === 'loads' : loadToolActive;
  const moreGroupHighlighted = mobileMenu ? mobileMenu === 'more' : moreToolActive;

  const closeMobileMenu = (restoreFocus = true) => {
    const closingMenu = mobileMenu;
    setMobileMenu(null);
    if (!restoreFocus || !closingMenu) return;
    window.requestAnimationFrame(() => {
      (closingMenu === 'loads' ? loadMenuButtonRef : moreMenuButtonRef).current?.focus();
    });
  };

  useEffect(() => {
    if (!mobileMenu) return undefined;
    const focusFrame = window.requestAnimationFrame(() => paletteRef.current?.querySelector<HTMLButtonElement>('.mobile-palette-tool')?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeMobileMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
    };
    // closeMobileMenu intentionally captures the currently open sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileMenu]);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 1023px)');
    if (!query) return undefined;
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileMenu(null);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const paletteTitle = mobileMenu === 'loads' ? t('toolbar.addLoad') : t('toolbar.moreSheetTitle');
  const paletteDescription = mobileMenu === 'loads' ? t('toolbar.loadSheetDescription') : t('toolbar.moreSheetDescription');
  const mobilePalette = mobileMenu && typeof document !== 'undefined' ? createPortal(<>
    <div className="mobile-tool-sheet-backdrop" aria-hidden="true" onPointerDown={() => closeMobileMenu(false)} />
    <section
      ref={paletteRef}
      className={`mobile-tool-palette mobile-tool-palette-${mobileMenu}`}
      role="menu"
      aria-label={paletteTitle}
      aria-describedby="mobile-tool-palette-description"
    >
      <div className="mobile-tool-palette-handle" aria-hidden="true" />
      <header className="mobile-tool-palette-header">
        <div><strong>{paletteTitle}</strong><span id="mobile-tool-palette-description">{paletteDescription}</span></div>
        <button type="button" className="mobile-tool-palette-close" onClick={() => closeMobileMenu()}>{t('toolbar.close')}</button>
      </header>
      <div className="mobile-tool-palette-list">
        {mobilePaletteTools.map((definition) => <PaletteToolButton
          key={definition.id}
          definition={definition}
          label={t(definition.labelKey)}
          detail={definition.detailKey ? t(definition.detailKey) : ''}
          active={activeTool === definition.id}
          onSelect={selectTool}
        />)}
      </div>
    </section>
  </>, document.body) : null;

  return (
    <>
    <aside className={`toolbar${mobileMenu ? ' mobile-menu-open' : ''}`} aria-label={t('toolbar.label')}>
      <div className="desktop-tool-list">
        {visibleTools.map((definition) => <ToolButton
          key={definition.id}
          definition={definition}
          label={t(definition.labelKey)}
          active={activeTool === definition.id}
          onSelect={selectTool}
        />)}
        {classroom ? <button className="tool-button tool-more" aria-label={showMore ? 'Ocultar herramientas adicionales' : 'Más herramientas'} aria-expanded={showMore} onClick={() => setShowMore((current) => !current)}><MoreHorizontal size={22} /><span>{showMore ? 'Menos' : 'Más'}</span></button> : null}
      </div>

      <div className="toolbar-spacer" />
      <div className="selection-tip">
        <BoxSelect size={18} />
        <span>{t('toolbar.tip')}</span>
      </div>

      <nav className="mobile-tool-dock" aria-label={t('toolbar.primary')}>
        {mobilePrimaryTools.map((definition) => <ToolButton
          key={definition.id}
          definition={definition}
          label={t(definition.labelKey)}
          active={activeTool === definition.id}
          className="mobile-dock-tool"
          onSelect={selectTool}
        />)}
        <button
          ref={loadMenuButtonRef}
          className={`mobile-tool-group tool-button${loadGroupHighlighted ? ' active' : ''}`}
          aria-label={t('toolbar.loads')}
          aria-expanded={mobileMenu === 'loads'}
          aria-haspopup="menu"
          onClick={() => setMobileMenu((current) => current === 'loads' ? null : 'loads')}
        >
          <StructuralToolIcon tool="pointLoad" />
          <span>{t('toolbar.loadsShort')}</span>
        </button>
        <button
          ref={moreMenuButtonRef}
          className={`mobile-tool-group tool-button${moreGroupHighlighted ? ' active' : ''}`}
          aria-label={t('toolbar.more')}
          aria-expanded={mobileMenu === 'more'}
          aria-haspopup="menu"
          onClick={() => setMobileMenu((current) => current === 'more' ? null : 'more')}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          <span>{t('toolbar.moreShort')}</span>
        </button>
      </nav>
    </aside>
    {mobilePalette}
    </>
  );
};
