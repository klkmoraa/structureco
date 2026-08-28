import type { StructuralRenderTheme } from './threePortalAssets';
import type { ThreeStructuralAssetId } from './threeStructuralRender';

export const resolveStructuralAssetUrl = (
  assetId: ThreeStructuralAssetId,
  theme: StructuralRenderTheme,
  baseUrl = import.meta.env.BASE_URL,
) => {
  const [family, variant] = assetId.split(':');
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}assets/structural/${theme}/${family}/${variant}.png`;
};
