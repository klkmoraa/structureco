import type { LucideIcon } from 'lucide-react';
import { CircleHelp, LockKeyhole, PencilLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { Accordion } from '../../ui/disclosure';

export interface InspectorSummaryMetric {
  label: string;
  value: string;
  tone?: 'neutral' | 'axial' | 'shear' | 'moment';
}

export const InspectorSelectionSummary = ({
  icon: Icon,
  type,
  id,
  description,
  metrics = [],
  empty = false,
}: {
  icon: LucideIcon;
  type: string;
  id: string;
  description: string;
  metrics?: readonly InspectorSummaryMetric[];
  empty?: boolean;
}) => (
  <section className={`inspector-summary${empty ? ' is-empty' : ''}`} aria-label="Resumen de selección">
    <div className="inspector-summary__identity">
      <span className="inspector-summary__preview" aria-hidden="true"><Icon size={20} /></span>
      <div>
        <span className="inspector-summary__type">{type}</span>
        <strong>{id}</strong>
        <small>{description}</small>
      </div>
    </div>
    {metrics.length > 0 ? <dl className="inspector-summary__metrics" aria-label="Resultados rápidos">
      {metrics.map((metric) => <div key={metric.label} className={metric.tone ? `is-${metric.tone}` : undefined}>
        <dt>{metric.label}</dt>
        <dd>{metric.value}</dd>
      </div>)}
    </dl> : null}
  </section>
);

export const InspectorPropertyGroup = ({
  title,
  description,
  mode = 'editable',
  children,
  className = '',
}: {
  title: string;
  description?: string;
  mode?: 'editable' | 'derived';
  children: ReactNode;
  className?: string;
}) => (
  <section className={`inspector-property-group is-${mode}${className ? ` ${className}` : ''}`}>
    <header className="inspector-property-group__header">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <span className="inspector-property-group__mode">
        {mode === 'editable' ? <PencilLine size={13} aria-hidden="true" /> : <LockKeyhole size={13} aria-hidden="true" />}
        {mode === 'editable' ? 'Editable' : 'Calculado'}
      </span>
    </header>
    <div className="inspector-property-group__body">{children}</div>
  </section>
);

export interface InspectorDerivedRow {
  label: string;
  value: ReactNode;
  description?: string;
}

export const InspectorDerivedList = ({ rows }: { rows: readonly InspectorDerivedRow[] }) => (
  <dl className="inspector-derived-list">
    {rows.map((row) => <div key={row.label}>
      <dt>{row.label}{row.description ? <small>{row.description}</small> : null}</dt>
      <dd>{row.value}</dd>
    </div>)}
  </dl>
);

export const InspectorLockedState = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="inspector-locked-state" role="note">
    <LockKeyhole size={16} aria-hidden="true" />
    <div><strong>{title}</strong><span>{children}</span></div>
  </div>
);

export const InspectorHelper = ({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) => (
  <div className={`inspector-helper is-${tone}`} role={tone === 'warning' ? 'status' : undefined}>
    <CircleHelp size={16} aria-hidden="true" />
    <span>{children}</span>
  </div>
);

export const InspectorAdvancedProperties = ({
  id,
  expanded,
  onExpandedChange,
  children,
}: {
  id: string;
  expanded: readonly string[];
  onExpandedChange: (expanded: string[]) => void;
  children: ReactNode;
}) => (
  <Accordion
    multiple
    className="inspector-advanced"
    expanded={expanded}
    onExpandedChange={onExpandedChange}
    items={[{
      id,
      title: 'Propiedades avanzadas',
      content: <div className="inspector-advanced__content">{children}</div>,
    }]}
  />
);
