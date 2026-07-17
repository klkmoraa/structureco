import type { ProjectModel } from '../types';
import { normalizeProject } from '../data/migrate';

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

export const exportProjectJson = (project: ProjectModel) => {
  const normalized = normalizeProject(project);
  const safeName = normalized.name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || 'structureco-project';
  download(
    new Blob([JSON.stringify(normalized, null, 2)], { type: 'application/json' }),
    `${safeName}.structureco.json`,
  );
};

export const importProjectJson = async (file: File): Promise<ProjectModel> => {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('El archivo excede el límite de 20 MB.');
  }
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('El archivo no contiene JSON válido.');
  }
  return normalizeProject(parsed);
};

export const exportSvgElement = (svg: SVGSVGElement, filename: string) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}`;
  clone.prepend(style);
  const data = new XMLSerializer().serializeToString(clone);
  download(new Blob([data], { type: 'image/svg+xml' }), filename);
};

export const exportSvgAsPng = (svg: SVGSVGElement, filename: string) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const data = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml' }));
  const image = new Image();
  image.onload = () => {
    const box = svg.getBoundingClientRect();
    const scale = Math.max(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(scale, scale);
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#fff';
    context.fillRect(0, 0, box.width, box.height);
    context.drawImage(image, 0, 0, box.width, box.height);
    canvas.toBlob((blob) => {
      if (blob) download(blob, filename);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  image.src = url;
};
