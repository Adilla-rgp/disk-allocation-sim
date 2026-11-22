import { describe, expect, it } from 'vitest';
import { createDisk, createRng, hashString, occupyBlock, selectFreeBlocks } from '../../src/core';

describe('PRNG determinístico', () => {
  it('a mesma semente gera a mesma sequência', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 20 }, a);
    expect(Array.from({ length: 20 }, b)).toEqual(seqA);
  });

  it('sementes diferentes geram sequências diferentes', () => {
    const a = Array.from({ length: 5 }, createRng(1));
    const b = Array.from({ length: 5 }, createRng(2));
    expect(a).not.toEqual(b);
  });

  it('gera valores em [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('hashString é estável', () => {
    expect(hashString('A')).toBe(hashString('A'));
    expect(hashString('A')).not.toBe(hashString('B'));
  });
});

describe('Política de blocos livres', () => {
  it('first-free escolhe os livres de menor índice', () => {
    const disk = createDisk(8, 512);
    occupyBlock(disk, 1, 'X');
    expect(selectFreeBlocks(disk, 3, 'first-free', 0, 'A')).toEqual([0, 2, 3]);
  });

  it('retorna null quando não há livres suficientes', () => {
    expect(selectFreeBlocks(createDisk(2, 512), 3, 'first-free', 0, 'A')).toBeNull();
    expect(selectFreeBlocks(createDisk(2, 512), 3, 'random', 0, 'A')).toBeNull();
  });

  it('random é determinístico, só escolhe livres e não repete blocos', () => {
    const disk = createDisk(64, 512);
    for (let i = 0; i < 64; i += 3) occupyBlock(disk, i, 'X');
    const picked = selectFreeBlocks(disk, 10, 'random', 99, 'A')!;
    expect(selectFreeBlocks(disk, 10, 'random', 99, 'A')).toEqual(picked);
    expect(new Set(picked).size).toBe(10);
    expect(picked.every((i) => disk.blocks[i].owner === null)).toBe(true);
    expect(selectFreeBlocks(disk, 10, 'random', 100, 'A')).not.toEqual(picked);
  });
});
