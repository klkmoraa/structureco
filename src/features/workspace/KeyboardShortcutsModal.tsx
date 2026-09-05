import { memo } from 'react';
import { Dialog } from '../../design-system/components/overlays';
import { useI18n } from '../../i18n/useI18n';
import { TOOL_REGISTRY } from '../canvas/toolRegistry';
import './keyboardShortcutsModal.css';

export interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal = memo(function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={t('shortcuts.title')}
      description={t('shortcuts.description')}
      closeLabel={t('toolbar.close')}
      className="sc-shortcuts-dialog"
    >
      <div className="sc-shortcuts-grid">
        <section className="sc-shortcuts-group">
          <h3 className="sc-shortcuts-group-title">{t('shortcuts.groupTools')}</h3>
          <ul className="sc-shortcuts-list">
            {TOOL_REGISTRY.map((tool) => (
              <li key={tool.id} className="sc-shortcuts-item">
                <span>{t(tool.labelKey)}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>{tool.shortcut}</kbd>
                </span>
              </li>
            ))}
            <li className="sc-shortcuts-item">
              <span>{t('shortcuts.numericEdit')}</span>
              <span className="sc-shortcuts-item-keys">
                <kbd>F2</kbd>
              </span>
            </li>
            <li className="sc-shortcuts-item">
              <span>{t('shortcuts.cancelAction')}</span>
              <span className="sc-shortcuts-item-keys">
                <kbd>Esc</kbd>
              </span>
            </li>
          </ul>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <section className="sc-shortcuts-group">
            <h3 className="sc-shortcuts-group-title">{t('shortcuts.groupWorkspace')}</h3>
            <ul className="sc-shortcuts-list">
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.openPalette')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd>
                </span>
              </li>
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.undo')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Z</kbd>
                </span>
              </li>
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.redo')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Y</kbd>
                </span>
              </li>
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.deleteSelection')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>⌫</kbd> / <kbd>Supr</kbd>
                </span>
              </li>
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.toggleShortcuts')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>?</kbd>
                </span>
              </li>
            </ul>
          </section>

          <section className="sc-shortcuts-group">
            <h3 className="sc-shortcuts-group-title">{t('shortcuts.groupDatasheet')}</h3>
            <ul className="sc-shortcuts-list">
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.navigateCells')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd>
                </span>
              </li>
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.editCell')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>Enter</kbd> / <kbd>F2</kbd>
                </span>
              </li>
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.cancelCellEdit')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>Esc</kbd>
                </span>
              </li>
              <li className="sc-shortcuts-item">
                <span>{t('shortcuts.copyTable')}</span>
                <span className="sc-shortcuts-item-keys">
                  <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>C</kbd>
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Dialog>
  );
});

export default KeyboardShortcutsModal;
