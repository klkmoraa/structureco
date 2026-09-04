import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import type React from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { AnimatePresence, m, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import { useModalFocus } from './modalFocus';
import { easeOutIos, popIn, springs } from '../motion';
import { haptics } from '../../platform/haptics';
import { useMediaQuery } from '../../platform/useMediaQuery';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement<{ 'aria-describedby'?: string }>;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export const Tooltip = ({ content, children, placement = 'top', className = '' }: TooltipProps) => {
  const id = useId();
  const existingDescription = children.props['aria-describedby'];
  const trigger = cloneElement(children, {
    'aria-describedby': [existingDescription, id].filter(Boolean).join(' '),
  });

  return <span className={`sc-tooltip sc-tooltip--${placement}${className ? ` ${className}` : ''}`}>
    {trigger}
    <span id={id} role="tooltip" className="sc-tooltip__content">{content}</span>
  </span>;
};

export interface PopoverProps {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  disabled?: boolean;
  className?: string;
}

export const Popover = ({
  label,
  trigger,
  children,
  open,
  onOpenChange,
  align = 'start',
  disabled = false,
  className = '',
}: PopoverProps) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || rootRef.current?.contains(event.target)) return;
      onOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      const trigger = triggerRef.current;
      trigger?.focus({ preventScroll: true });
      window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return <div ref={rootRef} className={`sc-popover sc-popover--${align}${className ? ` ${className}` : ''}`}>
    <button
      ref={triggerRef}
      type="button"
      className="sc-popover__trigger"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      disabled={disabled}
      onClick={() => onOpenChange(!open)}
    >{trigger}</button>
    <AnimatePresence>
      {open ? (
        <m.section
          key={id}
          id={id}
          variants={reducedMotion ? undefined : popIn}
          initial={reducedMotion ? { opacity: 0 } : 'hidden'}
          animate={reducedMotion ? { opacity: 1 } : 'visible'}
          exit={reducedMotion ? { opacity: 0 } : 'exit'}
          transition={reducedMotion ? { duration: 0.01 } : easeOutIos}
          className="sc-popover__surface"
          role="dialog"
          aria-label={label}
        >
          {children}
        </m.section>
      ) : null}
    </AnimatePresence>
  </div>;
};

export type ModalSurfaceExtent = 'default' | 'peek';

interface ModalSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  kind: 'dialog' | 'drawer' | 'fullscreen';
  side?: 'left' | 'right' | 'bottom';
  className?: string;
  /** Explicit launcher used when another surface transfers focus during lazy loading. */
  returnFocusTo?: HTMLElement | null;
  /** The broker owns focus return for retained workspace surfaces. */
  restoreFocus?: boolean;
  surfaceId?: string;
  onSurfaceReady?: (ready: boolean) => void;
  /**
   * `peek` shrinks a `drawer`/`fullscreen` surface to a handle without
   * unmounting it: scroll, drafts and list position stay exactly where they
   * were. Only `drawer`/`fullscreen` accept it — the broker enforces that.
   */
  extent?: ModalSurfaceExtent;
  /** Restores a `peek`ed surface to `default`. Required when `extent` is passed. */
  onRestore?: () => void;
  /** Accessible label for the peek handle, e.g. "Restore Datasheet". */
  restoreLabel?: string;
}

const ModalSurface = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = 'Close',
  kind,
  side = 'right',
  className = '',
  returnFocusTo,
  restoreFocus = true,
  surfaceId,
  onSurfaceReady,
  extent = 'default',
  onRestore,
  restoreLabel,
}: ModalSurfaceProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const surfaceRef = useRef<HTMLElement>(null);
  const peeked = extent === 'peek';
  useModalFocus({
    open,
    containerRef: surfaceRef,
    onEscape: () => onOpenChange(false),
    restoreFocus,
    returnFocusTo,
    trapFocus: !peeked,
  });
  useLayoutEffect(() => {
    if (!open) return undefined;
    onSurfaceReady?.(true);
    return () => onSurfaceReady?.(false);
  }, [onSurfaceReady, open]);
  const reducedMotion = useReducedMotion();
  const dragControls = useDragControls();
  /*
   * Por debajo de 700 px el CSS presenta como hoja inferior TODO lo que se
   * abre: el diálogo, el cajón izquierdo y el derecho. El componente tiene que
   * saberlo para poner el asa donde de verdad está el borde de arrastre —si se
   * fiara sólo de `side`, un cajón derecho en un teléfono se dibujaría como
   * hoja y no se podría arrastrar.
   */
  const compact = useMediaQuery('(max-width: 700px)');

  if (typeof document === 'undefined') return null;

  const isDrawer = kind === 'drawer';
  /**
   * Presentada como hoja que nace del borde inferior.
   *
   * En un teléfono lo son las tres presentaciones: el CSS ya convertía el
   * diálogo y los cajones laterales en hoja, y la pantalla completa pasa a ser
   * una *page sheet* —el modal de iOS 13 en adelante: separada del borde
   * superior por el área segura, con las esquinas de arriba redondeadas y
   * arrastrable hacia abajo— en vez de una lámina a sangre que tapaba la
   * barra de estado y no dejaba ver de dónde venía.
   */
  const isSheet = !peeked && (compact || (isDrawer && side === 'bottom'));
  const drawerAxis: Record<NonNullable<ModalSurfaceProps['side']>, { hidden: Record<string, string>; visible: Record<string, number> }> = {
    right: { hidden: { x: '100%' }, visible: { x: 0 } },
    left: { hidden: { x: '-100%' }, visible: { x: 0 } },
    bottom: { hidden: { y: '100%' }, visible: { y: 0 } },
  };
  const enterAxis = isSheet ? drawerAxis.bottom : drawerAxis[side];
  const surfaceMotionProps = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.01 } }
    : isDrawer || isSheet
      ? {
        initial: enterAxis.hidden,
        animate: enterAxis.visible,
        exit: enterAxis.hidden,
        transition: springs.sheet,
      }
      : {
        initial: { opacity: 0, scale: 0.94, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.94, y: 8 },
        transition: springs.snappy,
      };

  /*
   * Arrastrar para descartar.
   *
   * El gesto no se escucha en toda la superficie sino sólo en la cabecera y el
   * asa (`dragListener={false}` + `dragControls`): si la hoja entera fuera
   * arrastrable, cualquier desplazamiento dentro de una lista larga la
   * cerraría a media lectura.
   *
   * El umbral combina recorrido y velocidad, como UIKit: 96 px de arrastre, o
   * un lanzamiento a más de 520 px/s aunque apenas se haya movido. Un tirón
   * corto y rápido cierra; un arrastre largo y dudoso, que se suelta a medio
   * camino, vuelve a su sitio.
   */
  const DISMISS_DISTANCE = 96;
  const DISMISS_VELOCITY = 520;
  const draggable = isSheet && !reducedMotion;
  const onDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      haptics.impact('light');
      onOpenChange(false);
    }
  };
  const startDrag = (event: React.PointerEvent) => {
    if (!draggable) return;
    // Un puntero fino ya tiene la aspa y el `Esc`; arrastrar con el ratón desde
    // la cabecera compite con seleccionar su texto.
    if (event.pointerType === 'mouse') return;
    dragControls.start(event);
  };
  const dragProps = draggable
    ? {
      drag: 'y' as const,
      dragListener: false,
      dragControls,
      dragConstraints: { top: 0, bottom: 0 },
      dragElastic: { top: 0, bottom: 0.55 },
      dragMomentum: false,
      onDragEnd,
    }
    : {};

  return createPortal(
    <AnimatePresence>
      {open ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reducedMotion ? { duration: 0.01 } : { duration: 0.2 }}
          className={`sc-overlay sc-overlay--${kind}${peeked ? ' sc-overlay--peek' : ''}`}
          data-ui-overlay={kind}
          data-surface-presentation={kind === 'dialog' ? 'overlay' : kind}
          onMouseDown={(event) => {
            if (peeked || event.target !== event.currentTarget) return;
            onOpenChange(false);
          }}
        >
          <m.section
            ref={surfaceRef}
            {...surfaceMotionProps}
            {...dragProps}
            className={`sc-modal-surface sc-modal-surface--${kind}${kind === 'drawer' ? ` sc-modal-surface--${side}` : ''}${isSheet ? ' sc-modal-surface--sheet' : ''}${peeked ? ' sc-modal-surface--peek' : ''}${className ? ` ${className}` : ''}`}
            data-level={kind === 'drawer' ? 'sheet' : 'modal'}
            data-workspace-surface={surfaceId}
            data-surface-extent={extent}
            role="dialog"
            aria-modal={peeked ? undefined : true}
            aria-label={peeked ? title : undefined}
            aria-labelledby={peeked ? undefined : titleId}
            aria-describedby={peeked || !description ? undefined : descriptionId}
            tabIndex={-1}
          >
            {peeked ? (
              <button
                type="button"
                className="sc-modal-surface__peek-handle"
                aria-label={restoreLabel ? `${restoreLabel}: ${title}` : title}
                onClick={() => onRestore?.()}
              >
                <Maximize2 size={16} aria-hidden="true" />
                <span>{title}</span>
              </button>
            ) : (
              <header className="sc-modal-surface__header" onPointerDown={startDrag}>
                {/*
                  * El asa de una hoja de iOS no es un botón: es la señal de que
                  * el borde se puede arrastrar, y quien no puede arrastrar
                  * (teclado, lector de pantalla) tiene la aspa justo al lado.
                  * Por eso es decorativa y no entra en el orden de foco.
                  */}
                {isSheet ? <span className="sc-modal-surface__grabber" aria-hidden="true" /> : null}
                <div>
                  <h2 id={titleId}>{title}</h2>
                  {description ? <p id={descriptionId}>{description}</p> : null}
                </div>
                <button type="button" className="sc-modal-surface__close" aria-label={closeLabel} onClick={() => onOpenChange(false)}><X size={18} /></button>
              </header>
            )}
            <div className="sc-modal-surface__body" inert={peeked} aria-hidden={peeked || undefined}>{children}</div>
            {footer ? <footer className="sc-modal-surface__footer">{footer}</footer> : null}
          </m.section>
        </m.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export interface DialogProps extends Omit<ModalSurfaceProps, 'kind' | 'side'> {}

export const Dialog = (props: DialogProps) => <ModalSurface {...props} kind="dialog" />;

export interface DrawerProps extends Omit<ModalSurfaceProps, 'kind'> {
  side?: 'left' | 'right' | 'bottom';
  presentation?: 'drawer' | 'fullscreen';
}

export const Drawer = ({ presentation = 'drawer', ...props }: DrawerProps) => <ModalSurface {...props} kind={presentation} />;
