import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectStructuralPng } from './structural-png-contract.mjs';

const pngHeader = ({ width, height, colorType }) => {
  const buffer = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = colorType;
  return buffer;
};

test('reads dimensions and alpha from a structural PNG header', () => {
  assert.deepEqual(inspectStructuralPng(pngHeader({ width: 900, height: 600, colorType: 6 })), {
    width: 900,
    height: 600,
    hasAlpha: true,
  });
});

test('rejects a raster without a PNG signature', () => {
  assert.throws(() => inspectStructuralPng(Buffer.alloc(33)), /PNG signature/);
});
