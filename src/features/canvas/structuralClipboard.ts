import type { ModelClipboard } from '../../data/modelOperations';

const STRUCTURAL_CLIPBOARD_PREFIX = 'structureco:model-clipboard:v1\n';

export interface ClipboardReadTextPort {
  readText?: () => Promise<string>;
}

export type ClipboardTextRead =
  | { status: 'unavailable' }
  | { status: 'blocked' }
  | { status: 'read'; text: string };

export const supportsClipboardReadText = (clipboard: ClipboardReadTextPort | null | undefined): clipboard is Required<ClipboardReadTextPort> => (
  typeof clipboard?.readText === 'function'
);

/** Reads at gesture time so a browser permission policy is observed, not guessed. */
export const readClipboardText = async (
  clipboard: ClipboardReadTextPort | null | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.clipboard,
): Promise<ClipboardTextRead> => {
  if (!supportsClipboardReadText(clipboard)) return { status: 'unavailable' };
  try {
    return { status: 'read', text: await clipboard.readText() };
  } catch {
    return { status: 'blocked' };
  }
};

export const encodeStructuralClipboard = (clipboard: ModelClipboard): string => (
  `${STRUCTURAL_CLIPBOARD_PREFIX}${JSON.stringify(clipboard)}`
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isRecordArray = (value: unknown): value is Record<string, unknown>[] => (
  Array.isArray(value) && value.every(isRecord)
);

/**
 * Native clipboard text is untrusted and may be an ordinary spreadsheet grid.
 * Accept only our explicit transport envelope; Datasheet keeps its tabular
 * `datasheetPaste` parser and structural mutations keep their model route.
 */
export const decodeStructuralClipboard = (text: string): ModelClipboard | null => {
  if (!text.startsWith(STRUCTURAL_CLIPBOARD_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(STRUCTURAL_CLIPBOARD_PREFIX.length));
    if (!isRecord(parsed) || typeof parsed.kind !== 'string') return null;
    if (parsed.kind === 'node') {
      return isRecord(parsed.node) && isRecordArray(parsed.nodalLoads) && isRecordArray(parsed.prescribedDisplacements)
        ? parsed as unknown as ModelClipboard
        : null;
    }
    if (parsed.kind === 'member') {
      return isRecord(parsed.member)
        && Array.isArray(parsed.nodes)
        && parsed.nodes.length === 2
        && parsed.nodes.every(isRecord)
        && isRecordArray(parsed.memberLoads)
        && isRecordArray(parsed.initialEffects)
        ? parsed as unknown as ModelClipboard
        : null;
    }
    if (parsed.kind === 'multi') {
      return isRecordArray(parsed.nodes)
        && isRecordArray(parsed.members)
        && isRecordArray(parsed.nodalLoads)
        && isRecordArray(parsed.memberLoads)
        && isRecordArray(parsed.prescribedDisplacements)
        && isRecordArray(parsed.initialEffects)
        ? parsed as unknown as ModelClipboard
        : null;
    }
  } catch {
    return null;
  }
  return null;
};
