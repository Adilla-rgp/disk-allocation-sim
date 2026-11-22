import { describe, expect, it } from 'vitest';
import {
  addEntry,
  cloneDirectory,
  createDirectory,
  getEntry,
  hasEntry,
  listEntries,
  removeEntry,
  requireEntry,
  type FileEntry,
} from '../../src/core';

const entryA: FileEntry = {
  name: 'A',
  sizeInBytes: 1000,
  technique: 'contiguous',
  start: 0,
  length: 2,
};

describe('Diretório', () => {
  it('adiciona, consulta e remove entradas', () => {
    const dir = createDirectory();
    addEntry(dir, entryA);
    expect(hasEntry(dir, 'A')).toBe(true);
    expect(getEntry(dir, 'A')).toEqual(entryA);
    expect(removeEntry(dir, 'A')).toEqual(entryA);
    expect(hasEntry(dir, 'A')).toBe(false);
    expect(removeEntry(dir, 'A')).toBeUndefined();
  });

  it('recusa nomes duplicados', () => {
    const dir = createDirectory();
    addEntry(dir, entryA);
    expect(() => addEntry(dir, entryA)).toThrow(/Já existe/);
  });

  it('requireEntry dá erro claro para arquivo inexistente ou de outra técnica', () => {
    const dir = createDirectory();
    addEntry(dir, entryA);
    expect(requireEntry(dir, 'A', 'contiguous').start).toBe(0);
    expect(() => requireEntry(dir, 'X', 'contiguous')).toThrow('Arquivo "X" não existe');
    expect(() => requireEntry(dir, 'A', 'linked')).toThrow(/técnica/);
  });

  it('listEntries e cloneDirectory devolvem cópias na ordem de inserção', () => {
    const dir = createDirectory();
    addEntry(dir, { ...entryA, name: 'B' });
    addEntry(dir, entryA);
    const list = listEntries(dir);
    expect(list.map((e) => e.name)).toEqual(['B', 'A']);
    list[0].sizeInBytes = 1;
    const copy = cloneDirectory(dir);
    removeEntry(copy, 'A');
    expect(getEntry(dir, 'B')!.sizeInBytes).toBe(1000);
    expect(hasEntry(dir, 'A')).toBe(true);
  });
});
