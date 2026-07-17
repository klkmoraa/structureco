import type { Tool } from '../types';

interface StructuralToolIconProps {
  tool: Tool;
  size?: number;
}

const iconProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const STRUCTURAL_TOOL_IDS = new Set<Tool>([
  'node',
  'member',
  'support',
  'pointLoad',
  'distributedLoad',
  'moment',
  'dimension',
]);

export const StructuralToolIcon = ({ tool, size = 22 }: StructuralToolIconProps) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };

  if (tool === 'node') {
    return <svg {...common} {...iconProps}><circle cx="12" cy="12" r="5.2" /><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" /></svg>;
  }
  if (tool === 'member') {
    return <svg {...common} {...iconProps}><path d="M5.5 17.5 18.5 6.5" /><circle cx="5.5" cy="17.5" r="2.2" fill="var(--surface)" /><circle cx="18.5" cy="6.5" r="2.2" fill="var(--surface)" /></svg>;
  }
  if (tool === 'support') {
    return <svg {...common} {...iconProps}><circle cx="12" cy="5.2" r="2" fill="var(--surface)" /><path d="m12 7.3-6.1 8.1h12.2L12 7.3Z" /><path d="M4.7 18.2h14.6M6.5 20.8l2-2.6m3 2.6 2-2.6m3 2.6 2-2.6" /></svg>;
  }
  if (tool === 'pointLoad') {
    return <svg {...common} {...iconProps}><path d="M12 3.5v12.2" /><path d="m8.5 12.2 3.5 3.5 3.5-3.5" /><path d="M5 20.2h14" /></svg>;
  }
  if (tool === 'distributedLoad') {
    return <svg {...common} {...iconProps}><path d="M4 5.2h16M5.8 5.2v10.2m6.2-10.2v10.2m6.2-10.2v10.2" /><path d="m3.8 12.8 2 2.6 2-2.6m2.2 0 2 2.6 2-2.6m2.2 0 2 2.6 2-2.6" /><path d="M3.2 19.6h17.6" /></svg>;
  }
  if (tool === 'moment') {
    return <svg {...common} {...iconProps}><path d="M17.8 7.1A7 7 0 1 0 18.9 15" /><path d="m18.1 3.8-.3 3.3-3.3-.3" /></svg>;
  }
  if (tool === 'dimension') {
    return <svg {...common} {...iconProps}><path d="M4 6.2v11.6m16-11.6v11.6M5.2 12h13.6" /><path d="m8 9.3-2.8 2.8L8 14.8m8-5.5 2.8 2.8-2.8 2.7" /></svg>;
  }
  return null;
};
