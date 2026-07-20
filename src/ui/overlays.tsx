import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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
    {open ? <section id={id} className="sc-popover__surface" role="dialog" aria-label={label}>{children}</section> : null}
  </div>;
};

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const useModalFocus = (
  open: boolean,
  onOpenChange: (open: boolean) => void,
  surfaceRef: RefObject<HTMLElement | null>,
) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) return undefined;
    const remember = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || target === document.body || target === document.documentElement) return;
      previousFocusRef.current = target;
    };
    remember(document.activeElement);
    const onFocusIn = (event: FocusEvent) => remember(event.target);
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body && !surfaceRef.current?.contains(activeElement)) {
      previousFocusRef.current = activeElement;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      surfaceRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(surfaceRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])];
      if (!focusable.length) {
        event.preventDefault();
        surfaceRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      const returnTarget = previousFocusRef.current;
      returnTarget?.focus({ preventScroll: true });
      window.requestAnimationFrame(() => returnTarget?.focus({ preventScroll: true }));
    };
  }, [open, onOpenChange, surfaceRef]);
};

interface ModalSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  kind: 'dialog' | 'drawer';
  side?: 'left' | 'right' | 'bottom';
  className?: string;
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
}: ModalSurfaceProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const surfaceRef = useRef<HTMLElement>(null);
  useModalFocus(open, onOpenChange, surfaceRef);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className={`sc-overlay sc-overlay--${kind}`}
      data-ui-overlay={kind}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <section
        ref={surfaceRef}
        className={`sc-modal-surface sc-modal-surface--${kind}${kind === 'drawer' ? ` sc-modal-surface--${side}` : ''}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="sc-modal-surface__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button type="button" className="sc-modal-surface__close" aria-label={closeLabel} onClick={() => onOpenChange(false)}><X size={18} /></button>
        </header>
        <div className="sc-modal-surface__body">{children}</div>
        {footer ? <footer className="sc-modal-surface__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
};

export interface DialogProps extends Omit<ModalSurfaceProps, 'kind' | 'side'> {}

export const Dialog = (props: DialogProps) => <ModalSurface {...props} kind="dialog" />;

export interface DrawerProps extends Omit<ModalSurfaceProps, 'kind'> {
  side?: 'left' | 'right' | 'bottom';
}

export const Drawer = (props: DrawerProps) => <ModalSurface {...props} kind="drawer" />;
