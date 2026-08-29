// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBytes } from './fileSystem';
import { claimLaunchedFile, onLaunchedFile, resetLaunchQueueForTests, startLaunchQueue } from './launchedFile';

const BYTES = new Uint8Array([1, 2, 3, 4]);
const request = (handle?: unknown) => ({
  bytes: BYTES,
  filename: 'modelo.structureco.json',
  mimeType: 'application/json',
  extension: '.json',
  description: 'Expediente structureCo',
  handle,
});

const fakeHandle = (name = 'guardado.structureco.json') => {
  const written: ArrayBuffer[] = [];
  return {
    name,
    written,
    async createWritable() {
      return {
        async write(data: BufferSource) { written.push(data as ArrayBuffer); },
        async close() {},
      };
    },
  };
};

const removePicker = () => delete (window as unknown as Record<string, unknown>).showSaveFilePicker;

afterEach(() => {
  removePicker();
  resetLaunchQueueForTests();
  delete (window as unknown as Record<string, unknown>).launchQueue;
  vi.restoreAllMocks();
});

describe('saveBytes', () => {
  it('writes an existing native handle without showing the picker again', async () => {
    const handle = fakeHandle();
    const picker = vi.fn();
    (window as unknown as Record<string, unknown>).showSaveFilePicker = picker;

    const outcome = await saveBytes(request(handle));

    expect(outcome.status).toBe('written');
    expect(picker).not.toHaveBeenCalled();
    expect(handle.written).toHaveLength(1);
  });

  it('picks a file once and returns its handle for the next save', async () => {
    const handle = fakeHandle('elegido.structureco.json');
    const picker = vi.fn(async () => handle);
    (window as unknown as Record<string, unknown>).showSaveFilePicker = picker;

    const outcome = await saveBytes(request());

    expect(outcome).toMatchObject({ status: 'written', filename: 'elegido.structureco.json', handle });
    expect(picker).toHaveBeenCalledOnce();
  });

  it('falls back to the established download when the browser lacks the API', async () => {
    removePicker();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:save', revokeObjectURL: () => {} });

    expect(await saveBytes(request())).toMatchObject({ status: 'downloaded', filename: 'modelo.structureco.json' });
    expect(click).toHaveBeenCalledOnce();
  });

  it('does not disguise a user cancellation as an error or download', async () => {
    (window as unknown as Record<string, unknown>).showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });

    expect(await saveBytes(request())).toEqual({ status: 'cancelled' });
  });
});

describe('launch queue', () => {
  it('keeps an operating-system file until the import surface claims it once', async () => {
    let consumer: ((params: { files?: Array<{ getFile(): Promise<File> }> }) => void) | null = null;
    (window as unknown as Record<string, unknown>).launchQueue = { setConsumer: (next: typeof consumer) => { consumer = next; } };
    startLaunchQueue();
    consumer!({ files: [{ async getFile() { return new File(['{}'], 'lanzado.structureco'); } }] });
    await Promise.resolve();
    await Promise.resolve();

    expect(claimLaunchedFile()?.file.name).toBe('lanzado.structureco');
    expect(claimLaunchedFile()).toBeNull();
  });

  it('delivers a later launch directly to the running import surface', async () => {
    let consumer: ((params: { files?: Array<{ getFile(): Promise<File> }> }) => void) | null = null;
    (window as unknown as Record<string, unknown>).launchQueue = { setConsumer: (next: typeof consumer) => { consumer = next; } };
    startLaunchQueue();
    const received: string[] = [];
    onLaunchedFile((launched) => received.push(launched.file.name));
    consumer!({ files: [{ async getFile() { return new File(['{}'], 'directo.structureco'); } }] });
    await Promise.resolve();
    await Promise.resolve();

    expect(received).toEqual(['directo.structureco']);
  });
});
