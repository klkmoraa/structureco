import { describe, expect, it } from 'vitest';
import { readCommandHistory, rememberCommand } from './commandHistory';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('commandHistory', () => {
  it('keeps the newest command first and removes duplicate entries', () => {
    const storage = createStorage();
    expect(rememberCommand(storage, 'analysis:run')).toEqual(['analysis:run']);
    expect(rememberCommand(storage, 'tool:datasheet')).toEqual(['tool:datasheet', 'analysis:run']);
    expect(rememberCommand(storage, 'analysis:run')).toEqual(['analysis:run', 'tool:datasheet']);
    expect(readCommandHistory(storage)).toEqual(['analysis:run', 'tool:datasheet']);
  });

  it('ignores malformed or overlong persisted histories', () => {
    const storage = createStorage();
    storage.setItem('structureco.command-history.v1', JSON.stringify(['analysis:run', 4, 'tool:datasheet', 'analysis:run', 'view:fit', 'view:grid', 'view:snap']));
    expect(readCommandHistory(storage)).toEqual(['analysis:run', 'tool:datasheet', 'view:fit', 'view:grid', 'view:snap']);
  });
});
