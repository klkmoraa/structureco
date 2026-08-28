import { useState } from 'react';
import { StructuralIllustration } from './StructuralIllustration';
import type { ThreeStructuralAssetId } from './threeStructuralRender';
import { resolveStructuralAssetUrl } from './structuralAssetUrl';
import './threeStructuralImage.css';

interface ThreeStructuralImageProps {
  assetId: ThreeStructuralAssetId;
  theme: 'light' | 'dark';
  alt?: string;
  className?: string;
  eager?: boolean;
}

export function ThreeStructuralImage({ assetId, theme, alt = '', className = '', eager = false }: ThreeStructuralImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <StructuralIllustration assetId={assetId} detail="hero" decorative={alt.length === 0} title={alt || undefined} motion="none" className={className} />;
  return <img
    alt={alt}
    className={`three-structural-image ${className}`.trim()}
    data-structural-asset-id={assetId}
    data-structural-render="three-prerender"
    data-render-theme={theme === 'dark' ? 'night' : 'day'}
    decoding="async"
    draggable={false}
    height="600"
    loading={eager ? 'eager' : 'lazy'}
    onError={() => setFailed(true)}
    src={resolveStructuralAssetUrl(assetId, theme === 'dark' ? 'night' : 'day')}
    width="900"
  />;
}
