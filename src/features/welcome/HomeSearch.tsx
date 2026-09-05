import { useRef, useState } from 'react';
import { ArrowUpRight, Search, X, type LucideIcon } from 'lucide-react';
import { useModalFocus } from '../../design-system/components/modalFocus';
import { normalizeSearch } from './homeSearchUtils';
import './homeSearch.css';

export interface HomeSearchOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  run: () => void;
}

export function HomeSearch({ language, options, onClose, returnFocusTo }: {
  language: 'es' | 'en'; options: HomeSearchOption[]; onClose: () => void; returnFocusTo?: HTMLElement | null;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const text = language === 'es'
    ? { title: 'Buscar herramientas', placeholder: '¿Qué quieres hacer?', empty: 'No se encontraron herramientas', hint: 'Prueba con proyectos, plantillas o importar.', close: 'Cerrar búsqueda', keyboard: '↑ ↓ navegar · Enter abrir · Esc cerrar' }
    : { title: 'Find tools', placeholder: 'What would you like to do?', empty: 'No tools found', hint: 'Try projects, templates or import.', close: 'Close search', keyboard: '↑ ↓ navigate · Enter open · Esc close' };
  const filtered = options.filter((option) => normalizeSearch(`${option.label} ${option.description}`).includes(normalizeSearch(query)));
  const active = filtered[Math.min(activeIndex, filtered.length - 1)];
  useModalFocus({ open: true, containerRef: panelRef, onEscape: onClose, initialFocus: () => inputRef.current, returnFocusTo });
  const choose = (option: HomeSearchOption) => { onClose(); option.run(); };
  const move = (direction: number) => {
    if (!filtered.length) return;
    const index = (activeIndex + direction + filtered.length) % filtered.length;
    setActiveIndex(index);
    panelRef.current?.querySelector(`#home-search-${filtered[index].id}`)?.scrollIntoView?.({ block: 'nearest' });
  };
  return <div className="sc-home-search-scrim" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panelRef} className="sc-home-search" role="dialog" aria-modal="true" aria-label={text.title} tabIndex={-1}>
      <header><Search size={21} aria-hidden="true" /><input ref={inputRef} role="combobox" aria-label={text.title} aria-expanded="true" aria-controls="home-search-results" aria-autocomplete="list" aria-activedescendant={active ? `home-search-${active.id}` : undefined} placeholder={text.placeholder} value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1); }
        if (event.key === 'Enter' && active) { event.preventDefault(); choose(active); }
      }} /><button type="button" aria-label={text.close} onClick={onClose}><X size={19} /></button></header>
      <div id="home-search-results" role="listbox" aria-label={text.title} className="sc-home-search__results">
        {filtered.map((option) => <div id={`home-search-${option.id}`} role="option" aria-selected={active?.id === option.id} key={option.id} onMouseEnter={() => setActiveIndex(filtered.indexOf(option))} onClick={() => choose(option)}><option.icon size={20} aria-hidden="true" /><span><strong>{option.label}</strong><small>{option.description}</small></span><ArrowUpRight size={17} aria-hidden="true" /></div>)}
      </div>
      {!filtered.length && <div role="status" className="sc-home-search__empty"><strong>{text.empty}</strong><p>{text.hint}</p></div>}
      <footer>{text.keyboard}</footer>
    </div>
  </div>;
}
